import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Button,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  profileRequestBody,
  profileSchema,
  profileValuesFromMe,
  type ProfileValues,
} from '../../../features/profile/profile-schema';
import { useProfileCatalogs } from '../../../features/profile/use-profile-catalogs';
import { CityPickerSheet } from '../../../features/cities/ui/city-picker-sheet';
import { AppError, responseError, toAppError } from '../../../shared/api/error';
import { useApiClient } from '../../../shared/api/use-api-client';
import { type Me, useMe } from '../../../shared/profile/use-me';
import {
  colors,
  radius,
  spacing,
  touchTarget,
} from '../../../shared/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const categoryIcons: Record<string, IoniconName> = {
  sport: 'football-outline',
  walks: 'walk-outline',
  games: 'dice-outline',
  culture: 'film-outline',
  music: 'musical-notes-outline',
  social: 'people-outline',
  languages: 'language-outline',
  other: 'ellipsis-horizontal',
};

export default function EditProfileScreen() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const me = useMe();
  const catalogs = useProfileCatalogs();
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
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

  const cityId = form.watch('cityId');
  const selectedCity = catalogs.cities.data?.find((city) => city.id === cityId);

  return (
    <View style={styles.screen} testID="edit-profile-screen">
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Назад"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.back()}
              style={styles.headerBackButton}
            >
              <Ionicons
                accessible={false}
                color={colors.primary}
                name="chevron-back"
                size={30}
              />
            </Pressable>
          ),
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleAlign: 'center',
          title: 'Редактировать профиль',
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fields}>
            <FormField
              error={form.formState.errors.displayName?.message}
              label="Имя в профиле"
            >
              <Controller
                control={form.control}
                name="displayName"
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextInput
                    autoCapitalize="words"
                    autoComplete="name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Например, Ева"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    testID="profile-display-name-input"
                    value={value}
                  />
                )}
              />
            </FormField>

            <FormField
              error={form.formState.errors.bio?.message}
              label="Краткое описание"
            >
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
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.bioInput]}
                    testID="profile-bio-input"
                    textAlignVertical="top"
                    value={value}
                  />
                )}
              />
            </FormField>

            {catalogs.isLoading ? (
              <ActivityIndicator color={colors.primary} />
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
                    render={() => (
                      <Pressable
                        accessibilityHint="Открыть список поддерживаемых городов"
                        accessibilityLabel={`Город: ${selectedCity?.name ?? 'не выбран'}`}
                        accessibilityRole="button"
                        onPress={() => {
                          Keyboard.dismiss();
                          setCityPickerOpen(true);
                        }}
                        style={({ pressed }) => [
                          styles.settingsCard,
                          styles.settingsRow,
                          pressed && styles.pressed,
                        ]}
                        testID="profile-city-picker"
                      >
                        <RowIcon name="location-outline" />
                        <RowCopy
                          label="Город"
                          value={selectedCity?.name ?? 'Выберите город'}
                        />
                        <Ionicons
                          accessible={false}
                          color={colors.textMuted}
                          name="chevron-forward"
                          size={24}
                        />
                      </Pressable>
                    )}
                  />
                  <FieldError message={form.formState.errors.cityId?.message} />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Интересы</Text>
                  <Text style={styles.hint}>Можно выбрать несколько</Text>
                  <Controller
                    control={form.control}
                    name="categoryIds"
                    render={({ field: { onChange, value } }) => (
                      <View style={styles.chips}>
                        {catalogs.categories.data?.map((category) => (
                          <ChoiceChip
                            categorySlug={category.slug}
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
                  <FieldError
                    message={form.formState.errors.categoryIds?.message}
                  />
                </View>
              </>
            )}

            <FieldError message={form.formState.errors.root?.message} />
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Pressable
            accessibilityLabel={
              form.formState.isSubmitting ? 'Сохраняем профиль' : 'Сохранить'
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: form.formState.isSubmitting }}
            disabled={
              form.formState.isSubmitting ||
              catalogs.isLoading ||
              Boolean(catalogs.error)
            }
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.submitButton,
              form.formState.isSubmitting && styles.submitButtonDisabled,
              pressed && !form.formState.isSubmitting && styles.pressed,
            ]}
            testID="profile-save"
          >
            <Text style={styles.submitButtonText}>
              {form.formState.isSubmitting ? 'Сохраняем…' : 'Сохранить'}
            </Text>
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <CityPickerSheet
        cities={catalogs.cities.data ?? []}
        error={catalogs.cities.error}
        isLoading={catalogs.cities.isPending}
        isOpen={cityPickerOpen}
        onClose={() => setCityPickerOpen(false)}
        onRetry={() => void catalogs.cities.refetch()}
        onSelect={(selectedId) => {
          form.setValue('cityId', selectedId, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setCityPickerOpen(false);
        }}
        optionTestIDPrefix="profile-city"
        selectedCityId={cityId}
        snapPoints={['65%']}
        subtitle="Город будет отображаться в вашем профиле."
        testID="profile-city-picker-sheet"
      />
    </View>
  );
}

function ChoiceChip({
  categorySlug,
  label,
  selected,
  onPress,
  testID,
}: {
  categorySlug: string;
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
      <Ionicons
        accessible={false}
        color={selected ? colors.surface : colors.primary}
        name={categoryIcons[categorySlug] ?? 'pricetag-outline'}
        size={21}
      />
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}

function FormField({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      <FieldError message={error} />
    </View>
  );
}

function RowIcon({ name }: { name: IoniconName }) {
  return (
    <View style={styles.rowIcon}>
      <Ionicons
        accessible={false}
        color={colors.primary}
        name={name}
        size={25}
      />
    </View>
  );
}

function RowCopy({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowCopy}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  content: {
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  fields: { gap: spacing.xxl },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  field: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 18, fontWeight: '800' },
  hint: { color: colors.textMuted, lineHeight: 21, marginTop: -spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bioInput: { minHeight: 118, textAlignVertical: 'top' },
  settingsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 82,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
  },
  rowCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  rowLabel: { color: colors.text, fontSize: 17, fontWeight: '800' },
  rowValue: { color: colors.textMuted, fontSize: 16, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  chipTextSelected: { color: colors.surface },
  catalogState: { alignItems: 'center', gap: spacing.md },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitButtonText: { color: colors.surface, fontSize: 18, fontWeight: '800' },
  headerBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.xs,
    minHeight: touchTarget,
    minWidth: touchTarget,
  },
  pressed: { opacity: 0.78 },
  error: { color: colors.danger },
});
