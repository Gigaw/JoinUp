import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryProvider } from '../shared/query/query-provider';
import { SessionProvider } from '../shared/session/session-context';

export default function RootLayout() {
  return (
    <SessionProvider>
      <QueryProvider>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </QueryProvider>
    </SessionProvider>
  );
}
