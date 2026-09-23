import { config } from '../config';
import type { PlaceSentiment } from '../types/sentiment';

const TOPICS_API_BASE_URL = config.topicsApiBaseUrl;

export async function getPlaceSentiment(): Promise<PlaceSentiment[]> {
  const response = await fetch(`${TOPICS_API_BASE_URL}/api/sentiment/places`);
  if (!response.ok) throw new Error('Failed to load place sentiment.');
  return (await response.json()) as PlaceSentiment[];
}
