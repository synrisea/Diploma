import { useQuery } from '@tanstack/react-query';
import { getDimensions } from '../api/dimensions';

export function useDimensions() {
  return useQuery({
    queryKey: ['dimensions'],
    queryFn: getDimensions,
    retry: 1,
  });
}
