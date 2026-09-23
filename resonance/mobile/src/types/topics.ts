export type TopicSentiment = 'positive' | 'negative' | 'mixed';

export interface Topic {
  id: number;
  label: string;
  keywords: string[];
  commentCount: number;
  localCommentCount: number;
  sentiment: TopicSentiment;
  computedAt: string;
}
