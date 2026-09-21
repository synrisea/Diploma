export type TopicStatus = 'pending' | 'approved' | 'rejected';

export interface AdminTopic {
  id: number;
  label: string;
  approvedLabel: string | null;
  status: TopicStatus;
  keywords: string[];
  candidates: string[];
  samples: string[];
  commentCount: number;
  placeCount: number;
  sentiment: string;
  computedAt: string;
  reviewedAt: string | null;
  mergedInto: number | null;
}

export interface AdminDimension {
  id: number;
  label: string;
  sentiment: string;
  comment_count: number;
  times_matched: number;
  last_seen_at: string;
  hidden: number;
}

export interface PipelineStatus {
  totalComments: number;
  commentsAtLastRun: number;
  commentsSinceLastRun: number;
  unclassifiedSentiment: number;
  lastPolledAt: string | null;
  lastReclusteredAt: string | null;
  topicCount: number;
  pendingReview: number;
}

export interface AdminOverview {
  totalComments: number;
  placesWithComments: number;
  topicsByStatus: Record<string, number>;
  placesWithApprovedTopics: number;
}

export interface AuditEntry {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}
