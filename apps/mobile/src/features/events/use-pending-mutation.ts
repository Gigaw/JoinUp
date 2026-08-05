import { useCallback, useEffect, useState } from 'react';
import {
  getPendingMutation,
  type PendingMutation,
} from './pending-mutation-store';

export function usePendingMutation(operation: string) {
  const [state, setState] = useState<{
    loading: boolean;
    mutation: PendingMutation | null;
  }>({ loading: true, mutation: null });

  const refresh = useCallback(async () => {
    const mutation = await getPendingMutation(operation);
    setState({ loading: false, mutation });
  }, [operation]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
