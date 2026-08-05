import { router } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EventForm } from '../../../features/events/event-form';
import { useCreateEventMutation } from '../../../features/events/event-mutations';
import {
  fromEventBody,
  isCreateEventBody,
  toCreateEventBody,
  type EventFormValues,
} from '../../../features/events/event-form-schema';
import { useEventCatalogs } from '../../../features/events/use-event-catalogs';
import { usePendingMutation } from '../../../features/events/use-pending-mutation';
import { useMe } from '../../../shared/profile/use-me';

export default function CreateEventScreen() {
  const me = useMe();
  const { cities, categories } = useEventCatalogs();
  const createOperation = `events.create:${me.data?.id ?? 'anonymous'}`;
  const createEvent = useCreateEventMutation(me.data?.id);
  const pending = usePendingMutation(createOperation);

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
      const event = await createEvent.mutateAsync(toCreateEventBody(values));
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
    <EventForm
      categories={categories.data}
      cities={cities.data}
      defaultValues={
        pendingBody
          ? fromEventBody(pendingBody)
          : createDefaults(defaultCityId, defaultCategoryId)
      }
      onSubmit={submit}
      submitLabel="Создать активность"
    />
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
  state: { alignItems: 'center', flex: 1, gap: 14, justifyContent: 'center' },
  error: { color: '#b42318', paddingHorizontal: 22, textAlign: 'center' },
});
