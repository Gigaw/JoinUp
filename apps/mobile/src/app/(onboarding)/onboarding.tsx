import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  onboardingSchema,
  type OnboardingValues,
} from '../../features/profile/onboarding-schema';
import { AppError, responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';
import { type Me, useMe } from '../../shared/profile/use-me';
import { useSession } from '../../shared/session/session-context';

type City = components['schemas']['CityDto'];
type Category = components['schemas']['CategoryDto'];

export default function OnboardingScreen() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const me = useMe();
  const { logout } = useSession();
  const cities = useQuery({
    queryKey: ['cities'],
    queryFn: async (): Promise<City[]> => {
      const result = await client.GET('/v1/cities');
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const result = await client.GET('/v1/categories');
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: me.data?.displayName ?? '',
      cityId: me.data?.city?.id ?? '',
      categoryIds: me.data?.interests.map((interest) => interest.id) ?? [],
      showAge: me.data?.showAge ?? false,
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const result = await client.PATCH('/v1/me', { body: values });
      if (!result.data) throw toAppError(responseError(result));
      queryClient.setQueryData<Me>(['me'], result.data);
      router.replace('/home');
    } catch (error) {
      setError('root', {
        message:
          error instanceof AppError
            ? error.message
            : 'Не удалось сохранить профиль.',
      });
    }
  });

  const catalogsLoading = cities.isPending || categories.isPending;
  const catalogError = cities.error ?? categories.error;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      testID="onboarding-screen"
    >
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Расскажите немного о себе</Text>
          <Text style={styles.subtitle}>
            Это поможет показывать подходящие активности рядом.
          </Text>
        </View>
        <Pressable onPress={() => void logout()}>
          <Text style={styles.logout}>Выйти</Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Имя в профиле</Text>
        <Controller
          control={control}
          name="displayName"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              autoCapitalize="words"
              autoComplete="name"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Например, Ева"
              style={styles.input}
              testID="onboarding-display-name-input"
              value={value}
            />
          )}
        />
        <FieldError message={errors.displayName?.message} />
      </View>

      {catalogsLoading ? (
        <ActivityIndicator />
      ) : catalogError ? (
        <View style={styles.catalogState}>
          <Text style={styles.error}>{catalogError.message}</Text>
          <Button
            title="Повторить"
            onPress={() => {
              void cities.refetch();
              void categories.refetch();
            }}
          />
        </View>
      ) : (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Город</Text>
            <Controller
              control={control}
              name="cityId"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chips}>
                  {cities.data?.map((city) => (
                    <ChoiceChip
                      key={city.id}
                      label={city.name}
                      selected={value === city.id}
                      onPress={() => onChange(city.id)}
                      testID={`onboarding-city-${city.slug}`}
                    />
                  ))}
                </View>
              )}
            />
            <FieldError message={errors.cityId?.message} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Интересы</Text>
            <Text style={styles.hint}>Можно выбрать несколько</Text>
            <Controller
              control={control}
              name="categoryIds"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chips}>
                  {categories.data?.map((category) => (
                    <ChoiceChip
                      key={category.id}
                      label={category.name}
                      selected={value.includes(category.id)}
                      onPress={() =>
                        onChange(
                          value.includes(category.id)
                            ? value.filter((id) => id !== category.id)
                            : [...value, category.id],
                        )
                      }
                      testID={`onboarding-category-${category.slug}`}
                    />
                  ))}
                </View>
              )}
            />
            <FieldError message={errors.categoryIds?.message} />
          </View>
        </>
      )}

      <Controller
        control={control}
        name="showAge"
        render={({ field: { onChange, value } }) => (
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.label}>Показывать возраст</Text>
              <Text style={styles.hint}>
                Дата рождения останется приватной. Другие увидят только
                рассчитанный возраст.
              </Text>
            </View>
            <Switch
              onValueChange={onChange}
              testID="onboarding-show-age-switch"
              value={value}
            />
          </View>
        )}
      />

      <FieldError message={errors.root?.message} />
      <Button
        title={isSubmitting ? 'Сохраняем…' : 'Продолжить'}
        disabled={isSubmitting || catalogsLoading || Boolean(catalogError)}
        onPress={() => void submit()}
        testID="onboarding-submit"
      />
    </ScrollView>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      testID={testID}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 24, backgroundColor: '#f6f7f9' },
  header: { flexDirection: 'row', gap: 16, justifyContent: 'space-between' },
  heading: { flex: 1, gap: 6 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#5c6470', lineHeight: 20 },
  logout: { color: '#2457d6', paddingVertical: 8 },
  field: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600' },
  hint: { color: '#5c6470', lineHeight: 19 },
  input: {
    backgroundColor: 'white',
    borderColor: '#aeb5bf',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'white',
    borderColor: '#aeb5bf',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipSelected: { backgroundColor: '#2457d6', borderColor: '#2457d6' },
  chipText: { color: '#20242a' },
  chipTextSelected: { color: 'white', fontWeight: '600' },
  switchRow: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  switchCopy: { flex: 1, gap: 4 },
  catalogState: { alignItems: 'center', gap: 12 },
  error: { color: '#b42318' },
});
