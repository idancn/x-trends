import OpenAI from 'openai';
import * as readline from 'readline';
import { availableTools } from './tools';
import { Tweet, Trend } from './types';
import { XScraper } from './x-scraper';
// @ts-expect-error - cli-pie is not typed
import Pie from 'cli-pie';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function resolveCommunityId(category: string): Promise<string> {
  const communityMapping: Record<string, string> = {
    technology: '1828333497351565520',
    science: '0987654321',
    politics: '1122334455',
    sports: '5566778899',
    entertainment: '9988776655',
    health: '1357924680',
    business: '2468013579',
  };

  const communityId = communityMapping[category.toLowerCase()];

  if (!communityId) {
    throw new Error(`No community ID found for category: ${category}`);
  }

  return communityId;
}

async function getTweets(communityId: string, days: number): Promise<Tweet[]> {
  console.log(`Fetching tweets for community ID: ${communityId}, days ${days}`);

  const scraper = new XScraper();
  return await scraper.getTweets(communityId, days);
}

async function analyzeTrends(tweets: Tweet[]): Promise<Trend[]> {
  const tweetTexts = tweets.map((tweet) => tweet.text).join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert trend analyzer. Extract the top 5 trends from these tweets and assign percentage values that sum to 100% based on their prominence.',
      },
      {
        role: 'user',
        content: `Analyze these tweets and identify the top 5 trends. For each trend provide a name, description, and percentage value of how much it's trending (the sum must be 100%):\n\n${tweetTexts}`,
      },
    ],
    functions: [
      {
        name: 'submitTrends',
        description: 'Submit the top 5 trends identified from the tweets',
        parameters: {
          type: 'object',
          properties: {
            trends: {
              type: 'array',
              description: 'The list of top 5 trends',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The name of the trend',
                  },
                  description: {
                    type: 'string',
                    description: 'A brief description of what the trend is about',
                  },
                  percentage: {
                    type: 'number',
                    description:
                      'Percentage value representing how much this topic is trending (must be between 0-100)',
                  },
                },
                required: ['name', 'description', 'percentage'],
              },
            },
          },
          required: ['trends'],
        },
      },
    ],
    function_call: { name: 'submitTrends' },
  });

  const functionCall = response.choices[0].message.function_call;
  if (!functionCall) {
    throw new Error('Failed to analyze trends');
  }

  const parsedResponse = JSON.parse(functionCall.arguments);
  return parsedResponse.trends as Trend[];
}

function displayTrendsAsPieChart(trends: Trend[]): string {
  const colors = [
    [46, 204, 113],
    [52, 152, 219],
    [155, 89, 182],
    [241, 196, 15],
    [230, 126, 34],
    [231, 76, 60],
    [52, 73, 94],
    [22, 160, 133],
  ];

  const pie = new Pie(
    7,
    trends.map((trend, index) => {
      return {
        label: trend.name,
        value: trend.percentage,
        color: colors[index % colors.length],
      };
    }),
    {
      legend: true,
      display_total: true,
      total_label: 'Total',
    },
  );

  return pie.toString();
}

export async function getTrendsByCategory(category: string, days: number = 3): Promise<Trend[]> {
  try {
    console.log(`Getting trends for category: ${category}`);

    const communityId = await resolveCommunityId(category);
    console.log(`Resolved community ID: ${communityId}`);

    const tweets = await getTweets(communityId, days);
    console.log(`Retrieved ${tweets.length} tweets`);

    const trends = await analyzeTrends(tweets);
    console.log(`Identified ${trends.length} trends`);

    const pieChart = displayTrendsAsPieChart(trends);
    console.log('\nTrends Visualization:\n');
    console.log(pieChart);

    return trends;
  } catch (error) {
    console.error('Error getting trends:', error);
    throw error;
  }
}

const messageHistory: Array<OpenAI.ChatCompletionMessageParam> = [
  {
    role: 'system',
    content: `You are an AI assistant that analyzes X (Twitter) trends. 
You have access to tools that can:
1. Find X community IDs for categories like technology, science, politics
2. Get tweets from these communities 
3. Analyze tweets to identify trends

When answering user questions:
- Be concise and helpful
- If the user asks about trends, use the getTrendsByCategory function
- If the user says "exit", simply acknowledge and say goodbye
- If the user asks for help, explain what you can do
- Always stay focused on the task of analyzing trends from X communities`,
  },
];

async function processInput(input: string): Promise<string> {
  try {
    if (input.toLowerCase() === 'exit') {
      return 'Goodbye!';
    }

    messageHistory.push({ role: 'user', content: input });

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: messageHistory,
      tools: availableTools,
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      messageHistory.push(responseMessage);

      const [toolCall] = responseMessage.tool_calls;
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      let functionResult;
      if (functionName === 'resolveCommunityId') {
        functionResult = await resolveCommunityId(functionArgs.category);
      } else if (functionName === 'getTweets') {
        functionResult = await getTweets(functionArgs.communityId, functionArgs.days);
      } else if (functionName === 'analyzeTrends') {
        functionResult = await analyzeTrends(functionArgs.tweets);
      } else if (functionName === 'getTrendsByCategory') {
        functionResult = await getTrendsByCategory(functionArgs.category, functionArgs.days);
      }

      messageHistory.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(functionResult),
      });

      const secondResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: messageHistory,
      });

      const secondResponseMessage = secondResponse.choices[0].message;
      messageHistory.push(secondResponseMessage);

      return secondResponseMessage.content || '';
    } else {
      messageHistory.push(responseMessage);

      return responseMessage.content || '';
    }
  } catch (error) {
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return 'An unknown error occurred';
  }
}

(function () {
  if (require.main === module) {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable is required');
      process.exit(1);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'You> ',
    });

    console.log('Welcome to Trends-by-X! This agent analyzes trends from X communities.');
    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      if (input.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        rl.close();
        return;
      }

      try {
        const response = await processInput(input);
        console.log(`\n${response}\n`);
      } catch (err) {
        if (err instanceof Error) {
          console.error(`\nError: ${err.message}\n`);
        } else {
          console.error('\nAn unknown error occurred\n');
        }
      }

      rl.prompt();
    });
  }
})();
