import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EventForm } from '../../../features/events/event-form';
import {
  EventCoverPicker,
  type EventCoverImage,
} from '../../../features/events/event-cover-picker';
import {
  useCreateEventMutation,
  useUploadEventImageMutation,
} from '../../../features/events/event-mutations';
import {
  fromEventBody,
  isCreateEventBody,
  toCreateEventBody,
  type EventFormValues,
} from '../../../features/events/event-form-schema';
import { useEventCatalogs } from '../../../features/events/use-event-catalogs';
import { usePendingMutation } from '../../../features/events/use-pending-mutation';
import { useMe } from '../../../shared/profile/use-me';
import { colors, spacing, touchTarget } from '../../../shared/theme/tokens';
import type { components } from '@vmeste/api-client';

type EventDetails = components['schemas']['EventDetailsDto'];

export default function CreateEventScreen() {
  const me = useMe();
  const { cities, categories } = useEventCatalogs();
  const createOperation = `events.create:${me.data?.id ?? 'anonymous'}`;
  const createEvent = useCreateEventMutation(me.data?.id);
  const uploadImage = useUploadEventImageMutation();
  const pending = usePendingMutation(createOperation);
  const [cover, setCover] = useState<EventCoverImage | null>(null);
  const [createdEvent, setCreatedEvent] = useState<EventDetails | null>(null);

  const loading =
    me.isPending || cities.isPending || categories.isPending || pending.loading;
  const error = me.error ?? cities.error ?? categories.error;
  if (loading) return <ActivityIndicator style={styles.center} />;
  if (error || !me.data || !cities.data || !categories.data) {
    return (
      <View style={styles.state}>
        <Text style={styles.error}>
          {error?.message ?? 'Не удалось загрузить форму.'}
        </Text>
        <Button
          onPress={() => {
            void me.refetch();
            void cities.refetch();
            void categories.refetch();
          }}
          title="Повторить"
        />
      </View>
    );
  }

  const defaultCityId = me.data.city?.id ?? cities.data[0]?.id ?? '';
  const defaultCategoryId =
    me.data.interests[0]?.id ?? categories.data[0]?.id ?? '';
  const pendingBody = isCreateEventBody(pending.mutation?.payload)
    ? pending.mutation.payload
    : null;

  const submit = async (values: EventFormValues) => {
    try {
      const event =
        createdEvent ??
        (await createEvent.mutateAsync(toCreateEventBody(values)));
      if (!createdEvent) setCreatedEvent(event);
      if (cover) {
        await uploadImage.mutateAsync({ eventId: event.id, image: cover });
      }
      router.replace({
        pathname: '/events/[eventId]',
        params: { eventId: event.id },
      });
    } catch (error) {
      await pending.refresh();
      throw error;
    }
  };

  return (
    <>
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
          title: 'Новая активность',
        }}
      />
      <EventForm
        categories={categories.data}
        cities={cities.data}
        defaultValues={
          pendingBody
            ? fromEventBody(pendingBody)
            : createDefaults(defaultCityId, defaultCategoryId)
        }
        imageControl={<EventCoverPicker onChange={setCover} value={cover} />}
        locked={Boolean(createdEvent)}
        lockedNotice={
          createdEvent
            ? 'Активность уже создана. Завершите загрузку выбранной обложки.'
            : undefined
        }
        onSubmit={submit}
        submitLabel={
          createdEvent ? 'Повторить загрузку обложки' : 'Создать активность'
        }
      />
    </>
  );
}

function createDefaults(cityId: string, categoryId: string): EventFormValues {
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  startsAt.setMinutes(0, 0, 0);
  return {
    title: '',
    categoryId,
    description: '',
    cityId,
    meetingPlace: '',
    startsAt,
    endsAt: null,
    capacity: 10,
    participationMode: 'automatic',
  };
}

const styles = StyleSheet.create({
  center: { flex: 1 },
  state: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.xl,
    textAlign: 'center',
  },
  headerBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.xs,
    minHeight: touchTarget,
    minWidth: touchTarget,
  },
});
