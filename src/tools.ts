export const availableTools = [
  {
    type: 'function' as const,
    function: {
      name: 'resolveCommunityId',
      description: 'Get the X community ID that is most relevant to the given category',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description:
              'The category to find a community for (e.g., technology, science, politics)',
          },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getTweets',
      description: 'Get a list of tweets from the specified X community ID',
      parameters: {
        type: 'object',
        properties: {
          communityId: {
            type: 'string',
            description: 'The X community ID to fetch tweets from',
          },
          days: {
            type: 'number',
            description: 'The number of days to fetch tweets for',
          },
        },
        required: ['communityId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'analyzeTrends',
      description: 'Analyze a list of tweets to identify the top 5 trends with percentage scores',
      parameters: {
        type: 'object',
        properties: {
          tweets: {
            type: 'array',
            description: 'List of tweets to analyze for trends',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                date: { type: 'string' },
                likes: { type: 'number' },
                retweets: { type: 'number' },
                replies: { type: 'number' },
              },
              required: ['text', 'date', 'likes', 'retweets', 'replies'],
            },
          },
        },
        required: ['tweets'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getTrendsByCategory',
      description:
        'Get the top 5 trends for a given category (e.g., technology, science, politics)',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'The category to get trends for (e.g., technology, science, politics)',
          },
          days: {
            type: 'number',
            description: 'the number of days to get trends for',
          },
        },
        required: ['category'],
      },
    },
  },
];
