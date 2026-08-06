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
  useDecideEventApplicationMutation,
  useJoinEventMutation,
  useLeaveEventMutation,
} from '../../../features/events/event-mutations';
import {
  useEventApplications,
  useEventDetails,
} from '../../../features/events/event-queries';

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const query = useEventDetails(eventId);
  const join = useJoinEventMutation(eventId);
  const cancel = useCancelEventMutation(eventId);
  const leave = useLeaveEventMutation(eventId);
  const applications = useEventApplications(
    eventId,
    Boolean(query.data?.availableActions.includes('reviewApplications')),
  );
  const decideApplication = useDecideEventApplicationMutation(eventId);

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
          {participationLabel(event.myParticipation.status)}
        </Text>
      ) : null}
      {event.myParticipation?.status === 'going' ? (
        <Link
          href={{ pathname: '/chats/[eventId]', params: { eventId } }}
          asChild
        >
          <Pressable style={styles.secondaryButton} testID="event-chat">
            <Text style={styles.secondaryButtonText}>Открыть чат</Text>
          </Pressable>
        </Link>
      ) : null}
      {join.error ? (
        <Text style={styles.error}>{join.error.message}</Text>
      ) : null}
      {cancel.error ? (
        <Text style={styles.error}>{cancel.error.message}</Text>
      ) : null}
      {leave.error ? (
        <Text style={styles.error}>{leave.error.message}</Text>
      ) : null}
      {decideApplication.error ? (
        <Text style={styles.error}>{decideApplication.error.message}</Text>
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
      {event.availableActions.includes('leave') ||
      event.availableActions.includes('withdraw') ? (
        <Pressable
          disabled={leave.isPending}
          onPress={() => leave.mutate()}
          style={styles.secondaryButton}
          testID="event-leave"
        >
          <Text style={styles.secondaryButtonText}>
            {leave.isPending
              ? 'Сохраняем…'
              : event.availableActions.includes('withdraw')
                ? 'Отозвать заявку'
                : 'Отказаться от участия'}
          </Text>
        </Pressable>
      ) : null}
      {event.availableActions.includes('reviewApplications') ? (
        <View style={styles.applications} testID="event-applications">
          <Text style={styles.boxTitle}>Ожидающие заявки</Text>
          {applications.isLoading ? <ActivityIndicator /> : null}
          {applications.error ? (
            <Text style={styles.error}>{applications.error.message}</Text>
          ) : null}
          {applications.data?.items.length === 0 ? (
            <Text style={styles.meta}>Новых заявок пока нет.</Text>
          ) : null}
          {applications.data?.items.map((application) => (
            <View key={application.id} style={styles.application}>
              <Text>{application.applicant.displayName}</Text>
              <View style={styles.applicationActions}>
                <Pressable
                  disabled={decideApplication.isPending}
                  onPress={() =>
                    decideApplication.mutate({
                      participationId: application.id,
                      decision: 'approve',
                    })
                  }
                  style={styles.approveButton}
                  testID={`application-approve-${application.id}`}
                >
                  <Text style={styles.approveButtonText}>Одобрить</Text>
                </Pressable>
                <Pressable
                  disabled={decideApplication.isPending}
                  onPress={() =>
                    decideApplication.mutate({
                      participationId: application.id,
                      decision: 'reject',
                    })
                  }
                  style={styles.rejectButton}
                  testID={`application-reject-${application.id}`}
                >
                  <Text style={styles.rejectButtonText}>Отклонить</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
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

function participationLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Заявка отправлена',
    going: 'Вы участвуете',
    rejected: 'Заявка отклонена',
    withdrawn: 'Заявка отозвана',
    cancelled: 'Вы отказались от участия',
  };
  return labels[status] ?? 'Статус участия обновлён';
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
  applications: {
    backgroundColor: '#f0f3f8',
    borderRadius: 14,
    gap: 12,
    padding: 16,
  },
  application: { gap: 10 },
  applicationActions: { flexDirection: 'row', gap: 10 },
  approveButton: {
    backgroundColor: '#067647',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  approveButtonText: { color: 'white', fontWeight: '600' },
  rejectButton: {
    borderColor: '#b42318',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  rejectButtonText: { color: '#b42318', fontWeight: '600' },
  error: { color: '#b42318', padding: 22 },
});
