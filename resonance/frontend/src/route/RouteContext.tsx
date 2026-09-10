import { createContext, useContext, useState, type ReactNode } from 'react';
import { usePlacesInBoundingBox } from '../hooks/usePlacesInBoundingBox';
import { usePlanItinerary } from '../hooks/usePlanItinerary';
import { orderStopsFixedStart } from '../lib/routeOrdering';
import { DISTRICT_BOUNDS } from '../lib/mapConstants';
import type { PlaceDto } from '../types/place';

interface RouteContextValue {
  routeStops: PlaceDto[] | null;
  planRoute: (wish: string) => void;
  clearRoute: () => void;
  isPlanning: boolean;
  isError: boolean;
  error: unknown;
  hasEmptyResult: boolean;
}

const RouteContext = createContext<RouteContextValue | undefined>(undefined);

export function RouteProvider({ children }: { children: ReactNode }) {
  const { data: places = [] } = usePlacesInBoundingBox(DISTRICT_BOUNDS);
  const [routeStops, setRouteStops] = useState<PlaceDto[] | null>(null);
  const planItinerary = usePlanItinerary();

  const planRoute = (wish: string) => {
    planItinerary.mutate(
      {
        wish,
        candidatePlaces: places.map((p) => ({ id: p.id, name: p.name, categoryName: p.categoryName })),
      },
      {
        onSuccess: (response) => {
          const matched = response.placeIds
            .map((id) => places.find((p) => p.id === id))
            .filter((p): p is PlaceDto => p !== undefined);
          setRouteStops(matched.length > 0 ? orderStopsFixedStart(matched) : null);
        },
      },
    );
  };

  const clearRoute = () => {
    setRouteStops(null);
    planItinerary.reset();
  };

  return (
    <RouteContext.Provider
      value={{
        routeStops,
        planRoute,
        clearRoute,
        isPlanning: planItinerary.isPending,
        isError: planItinerary.isError,
        error: planItinerary.error,
        hasEmptyResult: planItinerary.isSuccess && planItinerary.data.placeIds.length === 0,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute(): RouteContextValue {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within RouteProvider');
  return ctx;
}
