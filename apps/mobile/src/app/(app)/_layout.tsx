import { Redirect, Stack } from 'expo-router';
import { EventCatalogStateProvider } from '../../features/events/event-catalog-state';
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
    <EventCatalogStateProvider>
      <Stack screenOptions={{ headerBackTitle: 'Назад' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile/edit"
          options={{ title: 'Редактировать профиль' }}
        />
        <Stack.Screen name="settings" options={{ title: 'Настройки' }} />
        <Stack.Screen name="events/index" options={{ title: 'Активности' }} />
        <Stack.Screen
          name="activities/index"
          options={{ title: 'Мои активности' }}
        />
        <Stack.Screen
          name="events/[eventId]"
          options={{ title: 'Активность' }}
        />
        <Stack.Screen
          name="events/create"
          options={{ title: 'Новая активность' }}
        />
        <Stack.Screen
          name="events/edit"
          options={{ title: 'Редактирование' }}
        />
        <Stack.Screen name="chats/[eventId]" options={{ title: 'Чат' }} />
      </Stack>
    </EventCatalogStateProvider>
  );
}
