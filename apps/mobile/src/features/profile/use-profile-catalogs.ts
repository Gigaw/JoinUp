import { useCategories } from '../categories/use-categories';
import { useCities } from '../cities/use-cities';

export function useProfileCatalogs() {
  const cities = useCities();
  const categories = useCategories();

  return {
    cities,
    categories,
    isLoading: cities.isPending || categories.isPending,
    error: cities.error ?? categories.error,
    retry: () => {
      void cities.refetch();
      void categories.refetch();
    },
  };
}
