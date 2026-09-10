export type Sentiment = 'positive' | 'negative' | 'mixed';

export interface Dimension {
  id: number;
  label: string;
  keywords: string[];
  sentiment: Sentiment;
  commentCount: number;
  placeCounts: Record<string, number>;
  firstSeenAt: string;
  lastSeenAt: string;
  timesMatched: number;
}
