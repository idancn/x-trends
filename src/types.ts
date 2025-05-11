export interface Tweet {
  id: string;
  text: string;
  date: Date;
  likes: number;
  retweets: number;
  replies: number;
}

export interface Trend {
  name: string;
  description: string;
  percentage: number;
}
