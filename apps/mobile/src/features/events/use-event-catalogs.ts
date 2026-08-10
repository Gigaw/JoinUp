import { useCategories } from '../categories/use-categories';
import { useCities } from '../cities/use-cities';

export type { City } from '../cities/use-cities';
export type { Category } from '../categories/use-categories';

export function useEventCatalogs() {
  const cities = useCities();
  const categories = useCategories();

  return { cities, categories };
}
