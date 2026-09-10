import type { PlanItineraryRequest, PlanItineraryResponse } from '../types/itinerary';

const TOPICS_API_BASE_URL = import.meta.env.VITE_TOPICS_API_BASE_URL ?? 'http://localhost:8010';

export async function planItinerary(body: PlanItineraryRequest): Promise<PlanItineraryResponse> {
  const response = await fetch(`${TOPICS_API_BASE_URL}/api/itinerary/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error('Failed to plan route.');

  return (await response.json()) as PlanItineraryResponse;
}
