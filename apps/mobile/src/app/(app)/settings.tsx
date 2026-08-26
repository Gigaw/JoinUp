import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { AppError, responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';
import { type Me, useMe } from '../../shared/profile/use-me';
import { colors, radius } from '../../shared/theme/tokens';

export default function SettingsScreen() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const me = useMe();
  const updateAgeVisibility = useMutation({
    mutationFn: async (showAge: boolean): Promise<Me> => {
      const result = await client.PATCH('/v1/me', { body: { showAge } });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
    onSuccess: (data) => queryClient.setQueryData<Me>(['me'], data),
  });

  if (me.isLoading) return <ActivityIndicator style={styles.center} />;
  if (!me.data)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {me.error?.message ?? 'Не удалось загрузить настройки.'}
        </Text>
        <Button title="Повторить" onPress={() => void me.refetch()} />
      </View>
    );

  const error = updateAgeVisibility.error;
  return (
    <View style={styles.container} testID="settings-screen">
      <Stack.Screen options={{ title: 'Настройки' }} />
      <View style={styles.card}>
        <View style={styles.copy}>
          <Text style={styles.title}>Показывать возраст</Text>
          <Text style={styles.subtitle}>
            Дата рождения останется приватной. Другие увидят только рассчитанный
            возраст.
          </Text>
        </View>
        <Switch
          disabled={updateAgeVisibility.isPending}
          onValueChange={(showAge) => updateAgeVisibility.mutate(showAge)}
          testID="settings-show-age-switch"
          value={me.data.showAge}
        />
      </View>
      {error ? (
        <Text style={styles.error}>
          {error instanceof AppError
            ? error.message
            : 'Не удалось сохранить настройку.'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: 18,
    padding: 20,
  },
  center: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  copy: { flex: 1, gap: 5 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  subtitle: { color: colors.textMuted, lineHeight: 20 },
  error: { color: colors.danger },
});
