import type { Dimension } from '../types/dimensions';

const TOPICS_API_BASE_URL = import.meta.env.VITE_TOPICS_API_BASE_URL ?? 'http://localhost:8010';

export async function getDimensions(): Promise<Dimension[]> {
  const response = await fetch(`${TOPICS_API_BASE_URL}/api/dimensions`);
  if (!response.ok) throw new Error('Failed to load dimensions.');
  return (await response.json()) as Dimension[];
}
