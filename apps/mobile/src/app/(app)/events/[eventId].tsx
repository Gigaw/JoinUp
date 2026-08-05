import { Link, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useCancelEventMutation,
  useJoinEventMutation,
} from '../../../features/events/event-mutations';
import { useEventDetails } from '../../../features/events/event-queries';

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const query = useEventDetails(eventId);
  const join = useJoinEventMutation(eventId);
  const cancel = useCancelEventMutation(eventId);

  if (query.isLoading) return <ActivityIndicator style={styles.center} />;
  if (query.error || !query.data) {
    return (
      <Text style={styles.error}>
        {query.error?.message ?? 'Событие не найдено.'}
      </Text>
    );
  }
  const event = query.data;
  const canJoin =
    event.availableActions.includes('join') ||
    event.availableActions.includes('apply');

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      testID="event-details-screen"
    >
      <Text style={styles.category}>{event.category.name}</Text>
      <Text style={styles.title}>{event.title}</Text>
      {event.status === 'cancelled' ? (
        <Text style={styles.cancelled}>Активность отменена</Text>
      ) : null}
      <Text style={styles.meta}>{formatDate(event.startsAt)}</Text>
      <Text style={styles.meta}>{event.meetingPlace}</Text>
      <Text style={styles.description}>{event.description}</Text>
      <View style={styles.box}>
        <Text style={styles.boxTitle}>
          Организатор: {event.organizer.displayName}
        </Text>
        <Text>
          {event.participantsCount} из {event.capacity} участников
        </Text>
      </View>
      {event.myParticipation ? (
        <Text style={styles.success}>
          {event.myParticipation.status === 'going'
            ? 'Вы участвуете'
            : 'Заявка отправлена'}
        </Text>
      ) : null}
      {join.error ? (
        <Text style={styles.error}>{join.error.message}</Text>
      ) : null}
      {cancel.error ? (
        <Text style={styles.error}>{cancel.error.message}</Text>
      ) : null}
      {canJoin ? (
        <Button
          title={
            join.isPending
              ? 'Отправляем…'
              : event.participationMode === 'automatic'
                ? 'Присоединиться'
                : 'Подать заявку'
          }
          disabled={join.isPending}
          onPress={() => join.mutate()}
          testID="event-participation-submit"
        />
      ) : null}
      {event.availableActions.includes('edit') ? (
        <Link href={{ pathname: './edit', params: { eventId } }} asChild>
          <Pressable style={styles.secondaryButton} testID="event-edit">
            <Text style={styles.secondaryButtonText}>Редактировать</Text>
          </Pressable>
        </Link>
      ) : null}
      {event.availableActions.includes('cancel') ? (
        <Pressable
          disabled={cancel.isPending}
          onPress={() =>
            Alert.alert(
              'Отменить активность?',
              'Она исчезнет из общего списка, а участники увидят статус отмены.',
              [
                { text: 'Не отменять', style: 'cancel' },
                {
                  text: 'Отменить',
                  style: 'destructive',
                  onPress: () => cancel.mutate(),
                },
              ],
            )
          }
          style={styles.cancelButton}
          testID="event-cancel"
        >
          <Text style={styles.cancelButtonText}>
            {cancel.isPending ? 'Отменяем…' : 'Отменить активность'}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  container: { padding: 22, gap: 14 },
  center: { flex: 1 },
  category: { color: '#2457d6', fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '700' },
  meta: { color: '#424a55', fontSize: 16 },
  description: { fontSize: 17, lineHeight: 25, marginVertical: 8 },
  box: { backgroundColor: '#f0f3f8', borderRadius: 14, padding: 16, gap: 6 },
  boxTitle: { fontWeight: '600' },
  success: { color: '#067647', fontWeight: '600', textAlign: 'center' },
  cancelled: {
    alignSelf: 'flex-start',
    backgroundColor: '#fee4e2',
    borderRadius: 8,
    color: '#b42318',
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#2457d6',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  secondaryButtonText: { color: '#2457d6', fontWeight: '600' },
  cancelButton: { alignItems: 'center', padding: 12 },
  cancelButtonText: { color: '#b42318', fontWeight: '600' },
  error: { color: '#b42318', padding: 22 },
});
