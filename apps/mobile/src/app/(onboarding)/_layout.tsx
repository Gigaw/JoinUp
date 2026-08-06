import { Redirect, Stack } from 'expo-router';
import {
  NavigationError,
  NavigationLoading,
} from '../../shared/navigation/navigation-state';
import { useRootDestination } from '../../shared/navigation/use-root-destination';

export default function OnboardingLayout() {
  const { destination, retry } = useRootDestination();
  if (destination === 'loading') return <NavigationLoading />;
  if (destination === 'error') return <NavigationError retry={retry} />;
  if (destination === 'sign-in') return <Redirect href="/sign-in" />;
  if (destination === 'events') return <Redirect href="/home" />;
  return (
    <Stack>
      <Stack.Screen name="onboarding" options={{ title: 'Ваш профиль' }} />
    </Stack>
  );
}
