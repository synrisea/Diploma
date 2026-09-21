import type {
  AdminDimension,
  AdminOverview,
  AdminTopic,
  AuditEntry,
  PipelineStatus,
  TopicStatus,
} from '../types/admin';

const TOPICS_API_BASE_URL = import.meta.env.VITE_TOPICS_API_BASE_URL ?? 'http://localhost:8010';

async function adminFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${TOPICS_API_BASE_URL}/api/admin${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = await response.json();
      if (typeof body?.detail === 'string') message = body.detail;
    } catch {}
    throw new Error(message);
  }

  return response;
}

export async function getAdminOverview(accessToken: string): Promise<AdminOverview> {
  return (await (await adminFetch('/overview', accessToken)).json()) as AdminOverview;
}

export async function getAdminTopics(accessToken: string, status?: TopicStatus): Promise<AdminTopic[]> {
  const query = status ? `?status=${status}` : '';
  return (await (await adminFetch(`/topics${query}`, accessToken)).json()) as AdminTopic[];
}

export async function approveTopic(
  accessToken: string,
  topicId: number,
  label: string,
  expectedComputedAt: string,
): Promise<void> {
  await adminFetch(`/topics/${topicId}/approve`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, expectedComputedAt }),
  });
}

export async function rejectTopic(accessToken: string, topicId: number): Promise<void> {
  await adminFetch(`/topics/${topicId}/reject`, accessToken, { method: 'POST' });
}

export async function reopenTopic(accessToken: string, topicId: number): Promise<void> {
  await adminFetch(`/topics/${topicId}/reopen`, accessToken, { method: 'POST' });
}

export async function mergeTopics(accessToken: string, sourceId: number, targetId: number): Promise<void> {
  await adminFetch('/topics/merge', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, targetId }),
  });
}

export async function getAdminDimensions(accessToken: string): Promise<AdminDimension[]> {
  return (await (await adminFetch('/dimensions', accessToken)).json()) as AdminDimension[];
}

export async function renameDimension(accessToken: string, dimensionId: number, label: string): Promise<void> {
  await adminFetch(`/dimensions/${dimensionId}/rename`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
}

export async function demoteDimension(accessToken: string, dimensionId: number): Promise<void> {
  await adminFetch(`/dimensions/${dimensionId}`, accessToken, { method: 'DELETE' });
}

export async function getPipelineStatus(accessToken: string): Promise<PipelineStatus> {
  return (await (await adminFetch('/pipeline', accessToken)).json()) as PipelineStatus;
}

export async function forceRetrain(accessToken: string): Promise<void> {
  await adminFetch('/pipeline/retrain', accessToken, { method: 'POST' });
}

export async function getAuditLog(accessToken: string): Promise<AuditEntry[]> {
  return (await (await adminFetch('/audit', accessToken)).json()) as AuditEntry[];
}
