import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppError } from '../../shared/api/error';
import { AppBottomSheet } from '../../shared/ui/bottom-sheet';
import {
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
} from '../../shared/theme/tokens';
import { eventFormSchema, type EventFormValues } from './event-form-schema';
import type { Category, City } from './use-event-catalogs';

const MIN_CAPACITY = 2;
const MAX_CAPACITY = 10_000;

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
type DateField = 'startsAt' | 'endsAt';
type PickerMode = 'date' | 'time';
type DatePickerDraft = {
  field: DateField;
  minimumDate: Date;
  value: Date;
};
type AndroidPickerState = DatePickerDraft & {
  mode: PickerMode;
};

export function EventForm({
  categories,
  cities,
  defaultValues,
  imageControl,
  locked = false,
  lockedNotice,
  onSubmit,
  submitLabel,
}: {
  categories: Category[];
  cities: City[];
  defaultValues: EventFormValues;
  imageControl?: ReactNode;
  locked?: boolean;
  lockedNotice?: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [dateSheet, setDateSheet] = useState<DatePickerDraft | null>(null);
  const [androidPicker, setAndroidPicker] = useState<AndroidPickerState | null>(
    null,
  );
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    defaultValues,
    resolver: zodResolver(eventFormSchema),
  });
  const startsAt = watch('startsAt');
  const endsAt = watch('endsAt');
  const cityId = watch('cityId');
  const participationMode = watch('participationMode');
  const selectedCity = cities.find((city) => city.id === cityId);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      setError('root', {
        message:
          error instanceof AppError
            ? error.message
            : 'Не удалось сохранить активность.',
      });
    }
  });

  const openDateTimePicker = (field: DateField) => {
    const minimumDate = field === 'endsAt' ? startsAt : new Date();
    const currentValue =
      field === 'endsAt'
        ? (endsAt ?? new Date(startsAt.getTime() + 2 * 60 * 60 * 1000))
        : startsAt;
    const value =
      currentValue.getTime() < minimumDate.getTime()
        ? minimumDate
        : currentValue;
    const draft = { field, minimumDate, value };

    if (Platform.OS === 'ios') {
      setDateSheet(draft);
      return;
    }
    setAndroidPicker({ ...draft, mode: 'date' });
  };

  const onDateSheetChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) return;
    setDateSheet((current) =>
      current ? { ...current, value: selected } : current,
    );
  };

  const confirmDateSheet = () => {
    const activeSheet = dateSheet;
    if (!activeSheet) return;
    setValue(activeSheet.field, activeSheet.value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setDateSheet(null);
  };

  const onAndroidPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    const activePicker = androidPicker;
    if (event.type === 'dismissed' || !activePicker || !selected) {
      setAndroidPicker(null);
      return;
    }

    const value = mergeDate(activePicker.value, selected, activePicker.mode);
    if (activePicker.mode === 'date') {
      setAndroidPicker({ ...activePicker, mode: 'time', value });
      return;
    }

    setValue(activePicker.field, value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setAndroidPicker(null);
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            pointerEvents={locked ? 'none' : 'auto'}
            style={[styles.fields, locked && styles.lockedFields]}
          >
            <FormField label="Название" error={errors.title?.message}>
              <Controller
                control={control}
                name="title"
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextInput
                    autoCapitalize="sentences"
                    maxLength={80}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Например, прогулка по центру"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.titleInput]}
                    testID="event-title-input"
                    value={value}
                  />
                )}
              />
            </FormField>

            <FormField label="Описание" error={errors.description?.message}>
              <Controller
                control={control}
                name="description"
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextInput
                    autoCapitalize="sentences"
                    maxLength={2000}
                    multiline
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Что будете делать и что взять с собой"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.multiline]}
                    testID="event-description-input"
                    textAlignVertical="top"
                    value={value}
                  />
                )}
              />
            </FormField>

            {imageControl ? (
              <View style={styles.field}>
                <Text style={styles.label}>Обложка</Text>
                {imageControl}
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Категория</Text>
              <Controller
                control={control}
                name="categoryId"
                render={({ field: { onChange, value } }) => (
                  <ScrollView
                    contentContainerStyle={styles.categoryList}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {categories.map((category) => (
                      <CategoryChip
                        category={category}
                        key={category.id}
                        onPress={() => onChange(category.id)}
                        selected={category.id === value}
                      />
                    ))}
                  </ScrollView>
                )}
              />
              <FieldError message={errors.categoryId?.message} />
            </View>

            <View style={styles.settingsCard}>
              <Pressable
                accessibilityHint="Открыть список поддерживаемых городов"
                accessibilityLabel={`Город: ${selectedCity?.name ?? 'не выбран'}`}
                accessibilityRole="button"
                onPress={() => setCityPickerOpen(true)}
                style={({ pressed }) => [
                  styles.settingsRow,
                  pressed && styles.pressed,
                ]}
                testID="event-city-picker"
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

              <Divider />

              <View style={styles.settingsRow}>
                <RowIcon name="navigate-outline" />
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>Место встречи</Text>
                  <Controller
                    control={control}
                    name="meetingPlace"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <TextInput
                        autoCapitalize="sentences"
                        maxLength={300}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder="Укажите место"
                        placeholderTextColor={colors.textMuted}
                        style={styles.rowInput}
                        testID="event-meeting-place-input"
                        value={value}
                      />
                    )}
                  />
                </View>
              </View>

              <Divider />

              <Pressable
                accessibilityHint="Изменить дату и время начала"
                accessibilityLabel={`Дата и время: ${formatDateTime(startsAt)}`}
                accessibilityRole="button"
                onPress={() => openDateTimePicker('startsAt')}
                style={({ pressed }) => [
                  styles.settingsRow,
                  pressed && styles.pressed,
                ]}
                testID="event-start"
              >
                <RowIcon name="calendar-outline" />
                <RowCopy
                  label="Дата и время"
                  value={formatDateTime(startsAt)}
                />
                <Ionicons
                  accessible={false}
                  color={colors.textMuted}
                  name="chevron-forward"
                  size={24}
                />
              </Pressable>

              <Divider />

              <OptionalEndRow
                endsAt={endsAt}
                onAdd={() => openDateTimePicker('endsAt')}
                onEdit={() => openDateTimePicker('endsAt')}
                onRemove={() =>
                  setValue('endsAt', null, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />

              <Divider />

              <Controller
                control={control}
                name="capacity"
                render={({ field: { onBlur, onChange, value } }) => (
                  <CapacityRow
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                  />
                )}
              />
            </View>
            <CardErrors
              messages={[
                errors.cityId?.message,
                errors.meetingPlace?.message,
                errors.startsAt?.message,
                errors.endsAt?.message,
                errors.capacity?.message,
              ]}
            />

            <View style={styles.field}>
              <Text style={styles.sectionTitle}>Как присоединяться</Text>
              <Controller
                control={control}
                name="participationMode"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.participationOptions}>
                    <ParticipationOption
                      label="Сразу присоединяться"
                      onPress={() => onChange('automatic')}
                      selected={value === 'automatic'}
                      testID="event-mode-automatic"
                    />
                    <ParticipationOption
                      label="По заявке"
                      onPress={() => onChange('approval_required')}
                      selected={value === 'approval_required'}
                      testID="event-mode-approval"
                    />
                  </View>
                )}
              />
              {participationMode === 'approval_required' ? (
                <Text style={styles.hint}>
                  Вам нужно будет подтверждать запросы на участие.
                </Text>
              ) : null}
              <FieldError message={errors.participationMode?.message} />
            </View>
          </View>

          {lockedNotice ? (
            <Text style={styles.lockedNotice}>{lockedNotice}</Text>
          ) : null}

          <FieldError message={errors.root?.message} />
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Pressable
            accessibilityLabel={submitLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting }}
            disabled={isSubmitting}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
              pressed && !isSubmitting && styles.pressed,
            ]}
            testID="event-form-submit"
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Сохраняем…' : submitLabel}
            </Text>
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {androidPicker ? (
        <DateTimePicker
          minimumDate={androidPicker.minimumDate}
          mode={androidPicker.mode}
          onChange={onAndroidPickerChange}
          value={androidPicker.value}
        />
      ) : null}

      <EventDateTimeSheet
        draft={dateSheet}
        onCancel={() => setDateSheet(null)}
        onChange={onDateSheetChange}
        onConfirm={confirmDateSheet}
      />

      <EventCityPickerSheet
        cities={cities}
        isOpen={cityPickerOpen}
        onClose={() => setCityPickerOpen(false)}
        onSelect={(selectedId) => {
          setValue('cityId', selectedId, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setCityPickerOpen(false);
        }}
        selectedCityId={cityId}
      />
    </View>
  );
}

function CategoryChip({
  category,
  onPress,
  selected,
}: {
  category: Category;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={`Категория ${category.name}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        selected && styles.categoryChipSelected,
        pressed && styles.pressed,
      ]}
      testID={`event-category-${category.slug}`}
    >
      <Ionicons
        accessible={false}
        color={selected ? colors.surface : colors.primary}
        name={categoryIcon(category.slug)}
        size={21}
      />
      <Text
        numberOfLines={1}
        style={[styles.categoryText, selected && styles.categoryTextSelected]}
      >
        {category.name}
      </Text>
    </Pressable>
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

function OptionalEndRow({
  endsAt,
  onAdd,
  onEdit,
  onRemove,
}: {
  endsAt: Date | null;
  onAdd: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  if (!endsAt) {
    return (
      <Pressable
        accessibilityLabel="Добавить время окончания"
        accessibilityRole="button"
        onPress={onAdd}
        style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
        testID="event-ends-at-add"
      >
        <RowIcon name="time-outline" />
        <RowCopy label="Окончание" value="Необязательно" />
        <Ionicons
          accessible={false}
          color={colors.primary}
          name="add-circle-outline"
          size={24}
        />
      </Pressable>
    );
  }

  return (
    <View style={styles.settingsRow}>
      <RowIcon name="time-outline" />
      <Pressable
        accessibilityLabel={`Окончание: ${formatDateTime(endsAt)}`}
        accessibilityRole="button"
        onPress={onEdit}
        style={({ pressed }) => [styles.endTimeCopy, pressed && styles.pressed]}
        testID="event-end"
      >
        <RowCopy label="Окончание" value={formatDateTime(endsAt)} />
      </Pressable>
      <Pressable
        accessibilityLabel="Убрать время окончания"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onRemove}
        style={styles.removeEndButton}
        testID="event-ends-at-remove"
      >
        <Ionicons
          accessible={false}
          color={colors.textMuted}
          name="close-circle-outline"
          size={23}
        />
      </Pressable>
    </View>
  );
}

function CapacityRow({
  onBlur,
  onChange,
  value,
}: {
  onBlur: () => void;
  onChange: (value: number) => void;
  value: number;
}) {
  const current = Number.isFinite(value) ? value : MIN_CAPACITY;
  const update = (next: number) =>
    onChange(Math.max(MIN_CAPACITY, Math.min(MAX_CAPACITY, next)));

  return (
    <View style={styles.settingsRow}>
      <RowIcon name="people-outline" />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>Лимит участников</Text>
        <Text style={styles.rowValue}>Включая вас</Text>
      </View>
      <View accessibilityLabel="Количество участников" style={styles.stepper}>
        <Pressable
          accessibilityLabel="Уменьшить количество участников"
          accessibilityRole="button"
          accessibilityState={{ disabled: current <= MIN_CAPACITY }}
          disabled={current <= MIN_CAPACITY}
          onPress={() => update(current - 1)}
          style={({ pressed }) => [
            styles.stepperButton,
            current <= MIN_CAPACITY && styles.stepperButtonDisabled,
            pressed && current > MIN_CAPACITY && styles.pressed,
          ]}
        >
          <Ionicons
            accessible={false}
            color={colors.text}
            name="remove"
            size={21}
          />
        </Pressable>
        <TextInput
          accessibilityLabel="Лимит участников"
          keyboardType="number-pad"
          maxLength={5}
          onBlur={onBlur}
          onChangeText={(text) =>
            onChange(text === '' ? Number.NaN : Number(text))
          }
          selectTextOnFocus
          style={styles.stepperInput}
          testID="event-capacity-input"
          value={Number.isFinite(value) ? String(value) : ''}
        />
        <Pressable
          accessibilityLabel="Увеличить количество участников"
          accessibilityRole="button"
          accessibilityState={{ disabled: current >= MAX_CAPACITY }}
          disabled={current >= MAX_CAPACITY}
          onPress={() => update(current + 1)}
          style={({ pressed }) => [
            styles.stepperButton,
            current >= MAX_CAPACITY && styles.stepperButtonDisabled,
            pressed && current < MAX_CAPACITY && styles.pressed,
          ]}
        >
          <Ionicons
            accessible={false}
            color={colors.text}
            name="add"
            size={21}
          />
        </Pressable>
      </View>
    </View>
  );
}

function ParticipationOption({
  label,
  onPress,
  selected,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.participationOption,
        selected && styles.participationOptionSelected,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <Ionicons
        accessible={false}
        color={selected ? colors.primary : colors.textMuted}
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={26}
      />
      <Text style={styles.participationLabel}>{label}</Text>
    </Pressable>
  );
}

function EventDateTimeSheet({
  draft,
  onCancel,
  onChange,
  onConfirm,
}: {
  draft: DatePickerDraft | null;
  onCancel: () => void;
  onChange: (event: DateTimePickerEvent, selected?: Date) => void;
  onConfirm: () => void;
}) {
  const isEndTime = draft?.field === 'endsAt';

  return (
    <AppBottomSheet
      isOpen={Boolean(draft)}
      onClose={onCancel}
      snapPoints={['55%']}
      testID={isEndTime ? 'event-end-sheet' : 'event-start-sheet'}
    >
      {draft ? (
        <View style={styles.dateSheet}>
          <View style={styles.dateSheetHeading}>
            <Text style={styles.sheetTitle}>
              {isEndTime ? 'Время окончания' : 'Дата и время начала'}
            </Text>
            <Text style={styles.sheetSubtitle}>
              {isEndTime
                ? 'Окончание не может быть раньше начала.'
                : 'Выберите дату и время активности.'}
            </Text>
          </View>
          <DateTimePicker
            display="spinner"
            locale="ru-RU"
            minimumDate={draft.minimumDate}
            mode="datetime"
            onChange={onChange}
            style={styles.dateSheetPicker}
            testID={isEndTime ? 'event-end-picker' : 'event-start-picker'}
            value={draft.value}
          />
          <View style={styles.dateSheetActions}>
            <Pressable
              accessibilityLabel="Отменить выбор даты и времени"
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.dateSheetAction,
                styles.dateSheetCancel,
                pressed && styles.pressed,
              ]}
              testID="event-date-cancel"
            >
              <Text style={styles.dateSheetCancelText}>Отмена</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Подтвердить дату и время"
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.dateSheetAction,
                styles.dateSheetConfirm,
                pressed && styles.pressed,
              ]}
              testID="event-date-confirm"
            >
              <Text style={styles.dateSheetConfirmText}>Готово</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </AppBottomSheet>
  );
}

function EventCityPickerSheet({
  cities,
  isOpen,
  onClose,
  onSelect,
  selectedCityId,
}: {
  cities: City[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (cityId: string) => void;
  selectedCityId: string;
}) {
  return (
    <AppBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={['65%']}
      testID="event-city-picker-sheet"
    >
      <Text style={styles.sheetTitle}>Выберите город</Text>
      <Text style={styles.sheetSubtitle}>
        Активность увидят пользователи выбранного города.
      </Text>
      <ScrollView
        contentContainerStyle={styles.cityOptions}
        showsVerticalScrollIndicator={false}
      >
        {cities.map((city) => {
          const selected = city.id === selectedCityId;
          return (
            <Pressable
              accessibilityLabel={`Город ${city.name}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={city.id}
              onPress={() => onSelect(city.id)}
              style={({ pressed }) => [
                styles.cityOption,
                selected && styles.cityOptionSelected,
                pressed && styles.pressed,
              ]}
              testID={`event-city-${city.slug}`}
            >
              <Ionicons
                accessible={false}
                color={selected ? colors.primary : colors.textMuted}
                name="location-outline"
                size={22}
              />
              <Text style={styles.cityOptionText}>{city.name}</Text>
              <Ionicons
                accessible={false}
                color={colors.primary}
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </AppBottomSheet>
  );
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

function CardErrors({ messages }: { messages: Array<string | undefined> }) {
  const visibleMessages = messages.filter((message): message is string =>
    Boolean(message),
  );
  return visibleMessages.length > 0 ? (
    <View style={styles.cardErrors}>
      {visibleMessages.map((message) => (
        <Text key={message} style={styles.error}>
          {message}
        </Text>
      ))}
    </View>
  ) : null;
}

function FieldError({ message }: { message?: string }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}

function Divider() {
  return <View style={styles.divider} />;
}

function mergeDate(current: Date, selected: Date, mode: PickerMode) {
  const next = new Date(current);
  if (mode === 'date') {
    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
    );
  } else {
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  }
  return next;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(
    value,
  );
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat('ru-RU', { timeStyle: 'short' }).format(value);
}

function formatDateTime(value: Date) {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

function categoryIcon(slug: string): IoniconName {
  return categoryIcons[slug] ?? 'pricetag-outline';
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
  field: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sectionTitle: { color: colors.text, ...typography.sectionTitle },
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
  titleInput: { fontSize: 20, fontWeight: '600' },
  multiline: { minHeight: 118, textAlignVertical: 'top' },
  categoryList: { gap: spacing.sm, paddingRight: spacing.xl },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  categoryTextSelected: { color: colors.surface },
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
  rowInput: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    marginHorizontal: -spacing.xs,
    minHeight: touchTarget,
    paddingHorizontal: spacing.xs,
    paddingVertical: 0,
  },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  endTimeCopy: { flex: 1, minWidth: 0 },
  removeEndButton: {
    alignItems: 'center',
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  stepper: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    height: touchTarget,
    overflow: 'hidden',
  },
  stepperButton: {
    alignItems: 'center',
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  stepperButtonDisabled: { opacity: 0.35 },
  stepperInput: {
    borderColor: colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    height: touchTarget,
    minWidth: 48,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
  },
  cardErrors: { gap: spacing.xs, marginTop: -spacing.lg },
  participationOptions: { gap: spacing.sm },
  participationOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
  },
  participationOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  participationLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  hint: { color: colors.textMuted, lineHeight: 21, marginTop: spacing.xs },
  lockedFields: { opacity: 0.68 },
  lockedNotice: {
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: -spacing.md,
  },
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
  sheetTitle: { color: colors.text, ...typography.sectionTitle },
  sheetSubtitle: {
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  dateSheet: { paddingTop: spacing.xl },
  dateSheetHeading: { gap: spacing.xs },
  dateSheetPicker: {
    alignSelf: 'stretch',
    height: 216,
    marginVertical: spacing.sm,
  },
  dateSheetActions: { flexDirection: 'row', gap: spacing.sm },
  dateSheetAction: {
    alignItems: 'center',
    borderRadius: radius.medium,
    flex: 1,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
  dateSheetCancel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  dateSheetConfirm: { backgroundColor: colors.primary },
  dateSheetCancelText: { color: colors.text, fontWeight: '800' },
  dateSheetConfirmText: { color: colors.surface, fontWeight: '800' },
  cityOptions: { gap: spacing.sm, paddingVertical: spacing.lg },
  cityOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.small,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cityOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  cityOptionText: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  error: { color: colors.danger, lineHeight: 20 },
  pressed: { opacity: 0.78 },
});
