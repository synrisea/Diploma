import { config } from '../config';
import type { Dimension } from '../types/dimensions';

const TOPICS_API_BASE_URL = config.topicsApiBaseUrl;

export async function getDimensions(): Promise<Dimension[]> {
  const response = await fetch(`${TOPICS_API_BASE_URL}/api/dimensions`);
  if (!response.ok) throw new Error('Failed to load dimensions.');
  return (await response.json()) as Dimension[];
}
