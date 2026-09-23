import { config } from '../config';
import type { PlanItineraryRequest, PlanItineraryResponse } from '../types/itinerary';

const TOPICS_API_BASE_URL = config.topicsApiBaseUrl;

export async function planItinerary(body: PlanItineraryRequest): Promise<PlanItineraryResponse> {
  const response = await fetch(`${TOPICS_API_BASE_URL}/api/itinerary/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error('Failed to plan route.');

  return (await response.json()) as PlanItineraryResponse;
}
