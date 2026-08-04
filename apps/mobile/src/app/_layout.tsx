import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryProvider } from '../shared/query/query-provider';
import { SessionProvider } from '../shared/session/session-context';

export default function RootLayout() {
  return (
    <SessionProvider>
      <QueryProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerBackTitle: 'Назад' }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="(auth)/register"
            options={{ title: 'Регистрация' }}
          />
          <Stack.Screen
            name="(app)/events/index"
            options={{ title: 'Активности' }}
          />
          <Stack.Screen
            name="(app)/events/[eventId]"
            options={{ title: 'Активность' }}
          />
        </Stack>
      </QueryProvider>
    </SessionProvider>
  );
}
