import axios from 'axios';
import { Tweet } from '../types';
import { getHeaders } from './utils/get-headers';
import { getFeatures } from './utils/get-features';

export class XScraper {
  private readonly baseUrl =
    'https://x.com/i/api/graphql/iLpz6KfITbe70KDddw-Frw/CommunityTweetsTimeline';

  async getTweets(communityId: string, days: number): Promise<Tweet[]> {
    const tweets: Tweet[] = [];
    const actualCutoffDate = new Date();
    actualCutoffDate.setDate(actualCutoffDate.getDate() - days);

    let cursor: string | null = null;
    let shouldContinue = true;

    while (shouldContinue) {
      const response = await this.fetchTweetsPage(communityId, cursor);

      const entries = this.getEntriesFromResponse(response);
      if (!entries || entries.length === 0) {
        break;
      }

      const newTweets = this.extractTweetsFromEntries(entries);
      newTweets.sort((a, b) => a.date.getTime() - b.date.getTime());
      const oldestTweetInBatch = newTweets.length > 0 ? newTweets[0].date : null;

      if (oldestTweetInBatch && oldestTweetInBatch < actualCutoffDate) {
        const relevantTweets = newTweets.filter((tweet) => tweet.date >= actualCutoffDate);
        tweets.push(...relevantTweets);
        shouldContinue = false;
      } else {
        tweets.push(...newTweets);

        cursor = this.getNextCursor(response);
        if (!cursor) {
          shouldContinue = false;
        }
      }
    }

    return tweets.filter((tweet) => tweet.date >= actualCutoffDate);
  }

  private async fetchTweetsPage(communityId: string, cursor: string | null): Promise<any> {
    const variables = {
      communityId,
      count: 20,
      displayLocation: 'Home',
      rankingMode: 'Relevance',
      withCommunity: true,
      ...(cursor && { cursor }),
    };

    const url = `${this.baseUrl}?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(getFeatures()))}`;

    try {
      const response = await axios.get(url, { headers: getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Error fetching tweets:', error);
      throw error;
    }
  }

  private getEntriesFromResponse(response: any): any[] {
    try {
      return (
        response?.data?.communityResults?.result?.ranked_community_timeline?.timeline?.instructions?.find(
          (instruction: any) => instruction.type === 'TimelineAddEntries',
        )?.entries || []
      );
    } catch (error) {
      console.error('Error parsing tweet entries:', error);
      return [];
    }
  }

  private getNextCursor(response: any): string | null {
    try {
      const entries =
        response?.data?.communityResults?.result?.ranked_community_timeline?.timeline?.instructions?.find(
          (instruction: any) => instruction.type === 'TimelineAddEntries',
        )?.entries || [];

      const cursorEntry = entries.find(
        (entry: any) =>
          entry.content?.entryType === 'TimelineTimelineCursor' &&
          entry.content?.cursorType === 'Bottom',
      );

      return cursorEntry?.content?.value || null;
    } catch (error) {
      console.error('Error finding cursor:', error);
      return null;
    }
  }

  private extractTweetsFromEntries(entries: any[]): Tweet[] {
    const tweets: Tweet[] = [];

    for (const entry of entries) {
      if (
        entry.content?.entryType === 'TimelineTimelineItem' &&
        entry.content?.itemContent?.itemType === 'TimelineTweet'
      ) {
        const tweetResult = entry.content?.itemContent?.tweet_results?.result;
        if (!tweetResult || tweetResult.__typename !== 'Tweet') continue;

        const legacy = tweetResult.legacy;
        if (!legacy) continue;

        const tweet: Tweet = {
          id: legacy.id_str,
          text: legacy.full_text,
          date: new Date(legacy.created_at),
          likes: legacy.favorite_count,
          retweets: legacy.retweet_count,
          replies: legacy.reply_count,
        };

        tweets.push(tweet);
      }
    }

    return tweets;
  }
}
