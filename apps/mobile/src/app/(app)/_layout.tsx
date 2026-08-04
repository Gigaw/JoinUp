import { Redirect, Stack } from 'expo-router';
import {
  NavigationError,
  NavigationLoading,
} from '../../shared/navigation/navigation-state';
import { useRootDestination } from '../../shared/navigation/use-root-destination';

export default function AppLayout() {
  const { destination, retry } = useRootDestination();
  if (destination === 'loading') return <NavigationLoading />;
  if (destination === 'error') return <NavigationError retry={retry} />;
  if (destination === 'sign-in') return <Redirect href="/sign-in" />;
  if (destination === 'onboarding') return <Redirect href="/onboarding" />;
  return (
    <Stack screenOptions={{ headerBackTitle: 'Назад' }}>
      <Stack.Screen name="events/index" options={{ title: 'Активности' }} />
      <Stack.Screen name="events/[eventId]" options={{ title: 'Активность' }} />
    </Stack>
  );
}
