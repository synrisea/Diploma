import { haversineDistanceMeters } from './geo';
import type { PlaceDto } from '../types/place';

const BRUTE_FORCE_MAX_STOPS = 8;

function distance(a: PlaceDto, b: PlaceDto): number {
  return haversineDistanceMeters(
    { lat: a.latitude, lng: a.longitude },
    { lat: b.latitude, lng: b.longitude },
  );
}

function pathLength(stops: PlaceDto[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += distance(stops[i - 1], stops[i]);
  }
  return total;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([items[i], ...perm]);
    }
  }
  return result;
}

function bruteForceOrder(start: PlaceDto, rest: PlaceDto[]): PlaceDto[] {
  let best = rest;
  let bestLength = Infinity;
  for (const perm of permutations(rest)) {
    const length = pathLength([start, ...perm]);
    if (length < bestLength) {
      bestLength = length;
      best = perm;
    }
  }
  return best;
}

function nearestNeighborOrder(start: PlaceDto, rest: PlaceDto[]): PlaceDto[] {
  const remaining = [...rest];
  const ordered: PlaceDto[] = [];
  let current = start;
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = distance(current, remaining[i]);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearestIndex = i;
      }
    }
    current = remaining[nearestIndex];
    ordered.push(current);
    remaining.splice(nearestIndex, 1);
  }
  return ordered;
}

export function orderStopsFixedStart(stops: PlaceDto[]): PlaceDto[] {
  if (stops.length <= 2) return stops;

  const [start, ...rest] = stops;
  const ordered =
    stops.length <= BRUTE_FORCE_MAX_STOPS ? bruteForceOrder(start, rest) : nearestNeighborOrder(start, rest);

  return [start, ...ordered];
}
