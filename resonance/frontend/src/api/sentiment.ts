import type { PlaceSentiment } from '../types/sentiment';

const TOPICS_API_BASE_URL = import.meta.env.VITE_TOPICS_API_BASE_URL ?? 'http://localhost:8010';

export async function getPlaceSentiment(): Promise<PlaceSentiment[]> {
  const response = await fetch(`${TOPICS_API_BASE_URL}/api/sentiment/places`);
  if (!response.ok) throw new Error('Failed to load place sentiment.');
  return (await response.json()) as PlaceSentiment[];
}
