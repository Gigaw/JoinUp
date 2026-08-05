import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Button,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppError } from '../../shared/api/error';
import { eventFormSchema, type EventFormValues } from './event-form-schema';
import type { Category, City } from './use-event-catalogs';

type PickerState = {
  field: 'startsAt' | 'endsAt';
  mode: 'date' | 'time';
};

export function EventForm({
  categories,
  cities,
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  categories: Category[];
  cities: City[];
  defaultValues: EventFormValues;
  onSubmit: (values: EventFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [picker, setPicker] = useState<PickerState | null>(null);
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

  const pickerValue =
    picker?.field === 'endsAt' ? (endsAt ?? startsAt) : startsAt;
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !picker || !selected) {
      setPicker(null);
      return;
    }
    const current = picker.field === 'endsAt' ? (endsAt ?? startsAt) : startsAt;
    const next = mergeDate(current, selected, picker.mode);
    setValue(picker.field, next, { shouldDirty: true, shouldValidate: true });
    setPicker(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <FormField label="Название" error={errors.title?.message}>
          <Controller
            control={control}
            name="title"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                maxLength={80}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Например, прогулка по центру"
                style={styles.input}
                testID="event-title-input"
                value={value}
              />
            )}
          />
        </FormField>

        <FormField label="Категория" error={errors.categoryId?.message}>
          <Controller
            control={control}
            name="categoryId"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chips}>
                {categories.map((category) => (
                  <ChoiceChip
                    key={category.id}
                    label={category.name}
                    selected={category.id === value}
                    onPress={() => onChange(category.id)}
                    testID={`event-category-${category.slug}`}
                  />
                ))}
              </View>
            )}
          />
        </FormField>

        <FormField label="Описание" error={errors.description?.message}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                maxLength={2000}
                multiline
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Что будете делать и что взять с собой"
                style={[styles.input, styles.multiline]}
                testID="event-description-input"
                textAlignVertical="top"
                value={value}
              />
            )}
          />
        </FormField>

        <FormField label="Город" error={errors.cityId?.message}>
          <Controller
            control={control}
            name="cityId"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chips}>
                {cities.map((city) => (
                  <ChoiceChip
                    key={city.id}
                    label={city.name}
                    selected={city.id === value}
                    onPress={() => onChange(city.id)}
                    testID={`event-city-${city.slug}`}
                  />
                ))}
              </View>
            )}
          />
        </FormField>

        <FormField label="Место встречи" error={errors.meetingPlace?.message}>
          <Controller
            control={control}
            name="meetingPlace"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                maxLength={300}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="У главного входа в парк"
                style={styles.input}
                testID="event-meeting-place-input"
                value={value}
              />
            )}
          />
        </FormField>

        <DateField
          label="Начало"
          value={startsAt}
          error={errors.startsAt?.message}
          onOpen={(mode) => setPicker({ field: 'startsAt', mode })}
          testID="event-start"
        />

        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.label}>Указать окончание</Text>
            <Text style={styles.hint}>Необязательно</Text>
          </View>
          <Switch
            onValueChange={(enabled) => {
              setValue(
                'endsAt',
                enabled
                  ? new Date(startsAt.getTime() + 2 * 60 * 60 * 1000)
                  : null,
                { shouldDirty: true, shouldValidate: true },
              );
            }}
            testID="event-ends-at-switch"
            value={Boolean(endsAt)}
          />
        </View>
        {endsAt ? (
          <DateField
            label="Окончание"
            value={endsAt}
            error={errors.endsAt?.message}
            onOpen={(mode) => setPicker({ field: 'endsAt', mode })}
            testID="event-end"
          />
        ) : null}

        <FormField
          label="Количество участников"
          error={errors.capacity?.message}
        >
          <Controller
            control={control}
            name="capacity"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                keyboardType="number-pad"
                onBlur={onBlur}
                onChangeText={(text) =>
                  onChange(text === '' ? Number.NaN : Number(text))
                }
                style={styles.input}
                testID="event-capacity-input"
                value={Number.isFinite(value) ? String(value) : ''}
              />
            )}
          />
        </FormField>

        <FormField
          label="Как присоединяться"
          error={errors.participationMode?.message}
        >
          <Controller
            control={control}
            name="participationMode"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chips}>
                <ChoiceChip
                  label="Сразу"
                  selected={value === 'automatic'}
                  onPress={() => onChange('automatic')}
                  testID="event-mode-automatic"
                />
                <ChoiceChip
                  label="После одобрения"
                  selected={value === 'approval_required'}
                  onPress={() => onChange('approval_required')}
                  testID="event-mode-approval"
                />
              </View>
            )}
          />
          <Text style={styles.hint}>
            При одобрении вы решаете, кто сможет участвовать.
          </Text>
        </FormField>

        <FieldError message={errors.root?.message} />
        <Button
          disabled={isSubmitting}
          onPress={() => void submit()}
          testID="event-form-submit"
          title={isSubmitting ? 'Сохраняем…' : submitLabel}
        />

        {picker ? (
          <DateTimePicker
            mode={picker.mode}
            onChange={onPickerChange}
            value={pickerValue}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
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

function DateField({
  error,
  label,
  onOpen,
  testID,
  value,
}: {
  error?: string;
  label: string;
  onOpen: (mode: 'date' | 'time') => void;
  testID: string;
  value: Date;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dateRow}>
        <Pressable
          onPress={() => onOpen('date')}
          style={styles.dateButton}
          testID={`${testID}-date`}
        >
          <Text>{formatDate(value)}</Text>
        </Pressable>
        <Pressable
          onPress={() => onOpen('time')}
          style={styles.dateButton}
          testID={`${testID}-time`}
        >
          <Text>{formatTime(value)}</Text>
        </Pressable>
      </View>
      <FieldError message={error} />
    </View>
  );
}

function ChoiceChip({
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

function mergeDate(current: Date, selected: Date, mode: 'date' | 'time') {
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { backgroundColor: '#f6f7f9', gap: 22, padding: 22 },
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
  multiline: { minHeight: 120 },
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
  dateRow: { flexDirection: 'row', gap: 10 },
  dateButton: {
    backgroundColor: 'white',
    borderColor: '#aeb5bf',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  switchCopy: { flex: 1, gap: 4 },
  error: { color: '#b42318' },
});
