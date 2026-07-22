import type { Topic } from '../types/topics';

const TOPICS_API_BASE_URL = import.meta.env.VITE_TOPICS_API_BASE_URL ?? 'http://localhost:8010';

export async function getTopicsForPlace(placeId: string): Promise<Topic[]> {
  const response = await fetch(`${TOPICS_API_BASE_URL}/api/topics/places/${placeId}`);
  if (!response.ok) throw new Error('Failed to load topics.');
  return (await response.json()) as Topic[];
}
