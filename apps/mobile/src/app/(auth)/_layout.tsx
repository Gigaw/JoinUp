import { Redirect, Stack } from 'expo-router';
import { NavigationLoading } from '../../shared/navigation/navigation-state';
import { useSession } from '../../shared/session/session-context';

export default function AuthLayout() {
  const { token, restoring } = useSession();
  if (restoring) return <NavigationLoading />;
  if (token) return <Redirect href="/" />;
  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ title: 'Вход' }} />
      <Stack.Screen name="register" options={{ title: 'Регистрация' }} />
    </Stack>
  );
}
