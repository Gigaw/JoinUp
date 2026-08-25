import { useCallback, useEffect, useState } from 'react';
import {
  getPendingMutation,
  type PendingMutation,
} from './pending-mutation-store';

type PendingMutationState = {
  operation: string;
  loading: boolean;
  mutation: PendingMutation | null;
};

export function usePendingMutation(operation: string) {
  const [state, setState] = useState<PendingMutationState>({
    operation,
    loading: true,
    mutation: null,
  });

  const refresh = useCallback(async () => {
    const mutation = await getPendingMutation(operation);
    setState((current) =>
      current.operation === operation
        ? { operation, loading: false, mutation }
        : current,
    );
  }, [operation]);

  useEffect(() => {
    setState({ operation, loading: true, mutation: null });
    void refresh();
  }, [operation, refresh]);

  const hasCurrentOperation = state.operation === operation;
  return {
    loading: !hasCurrentOperation || state.loading,
    mutation: hasCurrentOperation ? state.mutation : null,
    refresh,
  };
}
