import type { PlaceComment } from '../types/feedback';

const FEEDBACK_API_BASE_URL = import.meta.env.VITE_FEEDBACK_API_BASE_URL ?? 'http://localhost:5066';

export async function getPlaceComments(placeId: string): Promise<PlaceComment[]> {
  const response = await fetch(`${FEEDBACK_API_BASE_URL}/api/feedback/places/${placeId}/comments`);
  if (!response.ok) throw new Error('Failed to load comments.');
  return (await response.json()) as PlaceComment[];
}

export async function submitComment(token: string, placeId: string, comment: string): Promise<{ id: string }> {
  const response = await fetch(`${FEEDBACK_API_BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ placeId, comment }),
  });

  if (response.status === 401) throw new Error('Please log in again.');
  if (!response.ok) throw new Error('Failed to submit comment.');

  return (await response.json()) as { id: string };
}
