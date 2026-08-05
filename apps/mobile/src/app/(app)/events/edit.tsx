import type { components } from '@vmeste/api-client';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EventForm } from '../../../features/events/event-form';
import { useUpdateEventMutation } from '../../../features/events/event-mutations';
import { useEventDetails } from '../../../features/events/event-queries';
import {
  fromEventBody,
  isUpdateEventBody,
  pendingUpdateMatchesValues,
  toUpdateEventBody,
  type EventFormValues,
} from '../../../features/events/event-form-schema';
import { useEventCatalogs } from '../../../features/events/use-event-catalogs';
import { usePendingMutation } from '../../../features/events/use-pending-mutation';

type EventDetails = components['schemas']['EventDetailsDto'];

export default function EditEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { cities, categories } = useEventCatalogs();
  const event = useEventDetails(eventId);
  const updateEvent = useUpdateEventMutation(eventId);
  const pending = usePendingMutation(`events.update:${eventId}`);

  const loading =
    event.isPending ||
    cities.isPending ||
    categories.isPending ||
    pending.loading;
  const error = event.error ?? cities.error ?? categories.error;
  if (loading) return <ActivityIndicator style={styles.center} />;
  if (error || !event.data || !cities.data || !categories.data) {
    return (
      <View style={styles.state}>
        <Text style={styles.error}>
          {error?.message ?? 'Не удалось загрузить активность.'}
        </Text>
        <Button
          onPress={() => {
            void event.refetch();
            void cities.refetch();
            void categories.refetch();
          }}
          title="Повторить"
        />
      </View>
    );
  }
  if (!event.data.availableActions.includes('edit')) {
    return (
      <Text style={styles.error}>Эту активность уже нельзя редактировать.</Text>
    );
  }
  const pendingBody = isUpdateEventBody(pending.mutation?.payload)
    ? pending.mutation.payload
    : null;

  const submit = async (values: EventFormValues) => {
    const body =
      pendingBody && pendingUpdateMatchesValues(pendingBody, values)
        ? pendingBody
        : toUpdateEventBody(values, event.data.version);
    try {
      await updateEvent.mutateAsync(body);
      router.replace({ pathname: '/events/[eventId]', params: { eventId } });
    } catch (error) {
      await pending.refresh();
      throw error;
    }
  };

  return (
    <EventForm
      categories={categories.data}
      cities={cities.data}
      defaultValues={
        pendingBody ? fromEventBody(pendingBody) : toFormValues(event.data)
      }
      onSubmit={submit}
      submitLabel="Сохранить изменения"
    />
  );
}

function toFormValues(event: EventDetails): EventFormValues {
  return {
    title: event.title,
    categoryId: event.category.id,
    description: event.description,
    cityId: event.city.id,
    meetingPlace: event.meetingPlace,
    startsAt: new Date(event.startsAt),
    endsAt: event.endsAt ? new Date(event.endsAt) : null,
    capacity: event.capacity,
    participationMode: event.participationMode,
  };
}

const styles = StyleSheet.create({
  center: { flex: 1 },
  state: { alignItems: 'center', flex: 1, gap: 14, justifyContent: 'center' },
  error: { color: '#b42318', padding: 22, textAlign: 'center' },
});
