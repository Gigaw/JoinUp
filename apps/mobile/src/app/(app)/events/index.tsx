import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { responseError, toAppError } from '../../../shared/api/error';
import { useApiClient } from '../../../shared/api/use-api-client';
import { useSession } from '../../../shared/session/session-context';

export default function EventsScreen() {
  const client = useApiClient();
  const { logout } = useSession();
  const query = useQuery({
    queryKey: ['events', 'list'],
    queryFn: async () => {
      const cities = await client.GET('/v1/cities');
      if (!cities.data) throw toAppError(responseError(cities));
      const city = cities.data[0];
      if (!city) return { items: [], nextCursor: null };
      const events = await client.GET('/v1/events', {
        params: { query: { cityId: city.id, limit: 20 } },
      });
      if (!events.data) throw toAppError(responseError(events));
      return events.data;
    },
  });

  if (query.isLoading) {
    return <ActivityIndicator style={styles.center} />;
  }

  return (
    <View style={styles.container} testID="events-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Рядом с вами</Text>
          <Text style={styles.subtitle}>
            Выберите активность и присоединяйтесь
          </Text>
        </View>
        <Pressable onPress={() => void logout()} testID="events-logout">
          <Text style={styles.logout}>Выйти</Text>
        </Pressable>
      </View>
      {query.error ? (
        <Text style={styles.error}>{query.error.message}</Text>
      ) : null}
      <FlatList
        data={query.data?.items ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Пока нет будущих активностей.</Text>
        }
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: '/events/[eventId]',
              params: { eventId: item.id },
            }}
            asChild
          >
            <Pressable style={styles.card} testID={`event-card-${item.id}`}>
              <Text style={styles.category}>{item.category.name}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text>{formatDate(item.startsAt)}</Text>
              <Text>{item.meetingPlace}</Text>
              <Text style={styles.capacity}>
                {item.participantsCount} из {item.capacity} участников
              </Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f9' },
  center: { flex: 1 },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#5c6470', marginTop: 4 },
  logout: { color: '#2457d6', paddingTop: 8 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 18, gap: 7 },
  category: { color: '#2457d6', fontWeight: '600' },
  cardTitle: { fontSize: 20, fontWeight: '700' },
  capacity: { color: '#5c6470', marginTop: 4 },
  empty: { textAlign: 'center', color: '#5c6470', marginTop: 60 },
  error: { color: '#b42318', paddingHorizontal: 20 },
});
