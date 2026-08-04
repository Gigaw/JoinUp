import { useMe } from '../profile/use-me';
import { useSession } from '../session/session-context';
import { selectRootDestination } from './route-selection';

export function useRootDestination() {
  const { token, restoring } = useSession();
  const me = useMe();
  return {
    destination: selectRootDestination({
      restoring,
      hasToken: Boolean(token),
      meLoading: Boolean(token) && me.isPending,
      meError: me.isError,
      onboardingCompleted: me.data?.onboardingCompleted,
    }),
    retry: () => {
      void me.refetch();
    },
  };
}
