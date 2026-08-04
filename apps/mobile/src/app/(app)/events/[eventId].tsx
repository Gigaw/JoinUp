import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { responseError, toAppError } from '../../../shared/api/error';
import { useApiClient } from '../../../shared/api/use-api-client';

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['events', 'detail', eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const result = await client.GET('/v1/events/{eventId}', {
        params: { path: { eventId } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
  const join = useMutation({
    mutationFn: async () => {
      const result = await client.PUT('/v1/events/{eventId}/participation', {
        params: { path: { eventId } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['events', 'detail', eventId],
        }),
        queryClient.invalidateQueries({ queryKey: ['events', 'list'] }),
      ]);
    },
  });

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.category}>{event.category.name}</Text>
      <Text style={styles.title}>{event.title}</Text>
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
        />
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
  error: { color: '#b42318', padding: 22 },
});
