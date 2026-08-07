import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  profileRequestBody,
  profileSchema,
  profileValuesFromMe,
  type ProfileValues,
} from '../../../features/profile/profile-schema';
import { useProfileCatalogs } from '../../../features/profile/use-profile-catalogs';
import { AppError, responseError, toAppError } from '../../../shared/api/error';
import { useApiClient } from '../../../shared/api/use-api-client';
import { type Me, useMe } from '../../../shared/profile/use-me';
import { colors, radius } from '../../../shared/theme/tokens';

export default function EditProfileScreen() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const me = useMe();
  const catalogs = useProfileCatalogs();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: me.data ? profileValuesFromMe(me.data) : undefined,
  });

  if (me.isLoading) return <ActivityIndicator style={styles.center} />;
  if (!me.data)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {me.error?.message ?? 'Не удалось загрузить профиль.'}
        </Text>
        <Button title="Повторить" onPress={() => void me.refetch()} />
      </View>
    );

  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await client.PATCH('/v1/me', {
        body: profileRequestBody(values),
      });
      if (!result.data) throw toAppError(responseError(result));
      queryClient.setQueryData<Me>(['me'], result.data);
      router.back();
    } catch (error) {
      form.setError('root', {
        message:
          error instanceof AppError
            ? error.message
            : 'Не удалось сохранить профиль.',
      });
    }
  });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      testID="edit-profile-screen"
    >
      <Stack.Screen options={{ title: 'Редактировать профиль' }} />
      <View style={styles.field}>
        <Text style={styles.label}>Имя в профиле</Text>
        <Controller
          control={form.control}
          name="displayName"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              autoCapitalize="words"
              autoComplete="name"
              onBlur={onBlur}
              onChangeText={onChange}
              style={styles.input}
              testID="profile-display-name-input"
              value={value}
            />
          )}
        />
        <FieldError message={form.formState.errors.displayName?.message} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Краткое описание</Text>
        <Controller
          control={form.control}
          name="bio"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              autoCapitalize="sentences"
              maxLength={500}
              multiline
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Расскажите немного о себе"
              style={[styles.input, styles.bioInput]}
              testID="profile-bio-input"
              value={value}
            />
          )}
        />
        <FieldError message={form.formState.errors.bio?.message} />
      </View>

      {catalogs.isLoading ? (
        <ActivityIndicator />
      ) : catalogs.error ? (
        <View style={styles.catalogState}>
          <Text style={styles.error}>{catalogs.error.message}</Text>
          <Button title="Повторить" onPress={catalogs.retry} />
        </View>
      ) : (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Город</Text>
            <Controller
              control={form.control}
              name="cityId"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chips}>
                  {catalogs.cities.data?.map((city) => (
                    <ChoiceChip
                      key={city.id}
                      label={city.name}
                      selected={value === city.id}
                      onPress={() => onChange(city.id)}
                      testID={`profile-city-${city.slug}`}
                    />
                  ))}
                </View>
              )}
            />
            <FieldError message={form.formState.errors.cityId?.message} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Интересы</Text>
            <Controller
              control={form.control}
              name="categoryIds"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chips}>
                  {catalogs.categories.data?.map((category) => (
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
                      testID={`profile-category-${category.slug}`}
                    />
                  ))}
                </View>
              )}
            />
            <FieldError message={form.formState.errors.categoryIds?.message} />
          </View>
        </>
      )}

      <FieldError message={form.formState.errors.root?.message} />
      <Button
        title={form.formState.isSubmitting ? 'Сохраняем…' : 'Сохранить'}
        disabled={
          form.formState.isSubmitting ||
          catalogs.isLoading ||
          Boolean(catalogs.error)
        }
        onPress={() => void submit()}
        testID="profile-save"
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
  container: { backgroundColor: colors.background, gap: 22, padding: 20 },
  center: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  field: { gap: 8 },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.small,
    borderWidth: 1,
    color: colors.text,
    padding: 12,
  },
  bioInput: { minHeight: 96, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.surface, fontWeight: '700' },
  catalogState: { alignItems: 'center', gap: 12 },
  error: { color: colors.danger },
});
