const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5112';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
  );

  const response = await fetch(`${API_BASE_URL}${path}?${query.toString()}`);

  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
