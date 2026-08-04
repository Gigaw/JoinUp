import { Redirect } from 'expo-router';
import {
  NavigationError,
  NavigationLoading,
} from '../shared/navigation/navigation-state';
import { useRootDestination } from '../shared/navigation/use-root-destination';

export default function IndexScreen() {
  const { destination, retry } = useRootDestination();
  if (destination === 'loading') return <NavigationLoading />;
  if (destination === 'error') return <NavigationError retry={retry} />;
  if (destination === 'sign-in') return <Redirect href="/sign-in" />;
  if (destination === 'onboarding') return <Redirect href="/onboarding" />;
  return <Redirect href="/events" />;
}
