import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  type ActivitiesTab,
  useMyActivities,
} from '../../../features/activities/activity-queries';

const tabs: Array<{ value: ActivitiesTab; label: string }> = [
  { value: 'upcoming', label: 'Скоро' },
  { value: 'applications', label: 'Заявки' },
  { value: 'created', label: 'Созданные' },
  { value: 'past', label: 'Прошедшие' },
  { value: 'cancelled', label: 'Отменённые' },
];

export default function MyActivitiesScreen() {
  const [tab, setTab] = useState<ActivitiesTab>('upcoming');
  const query = useMyActivities(tab);
  if (query.isLoading) return <ActivityIndicator style={styles.center} />;
  return (
    <View style={styles.container} testID="my-activities-screen">
      <FlatList
        horizontal
        data={tabs}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setTab(item.value)}
            style={[styles.tab, tab === item.value && styles.activeTab]}
          >
            <Text
              style={tab === item.value ? styles.activeTabText : styles.tabText}
            >
              {item.label}
            </Text>
          </Pressable>
        )}
      />
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
          <Text style={styles.empty}>В этой вкладке пока нет активностей.</Text>
        }
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: '/events/[eventId]',
              params: { eventId: item.id },
            }}
            asChild
          >
            <Pressable style={styles.card} testID={`my-activity-${item.id}`}>
              <Text style={styles.category}>{item.category.name}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text>{formatDate(item.startsAt)}</Text>
              {item.myParticipation ? (
                <Text style={styles.status}>
                  {participationLabel(item.myParticipation.status)}
                </Text>
              ) : null}
              {item.pendingApplicationsCount !== null ? (
                <Text style={styles.status}>
                  Заявок ожидает: {item.pendingApplicationsCount}
                </Text>
              ) : null}
              {item.hasEventUpdates ? (
                <Text style={styles.update}>Есть изменения в активности</Text>
              ) : null}
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

function participationLabel(status: string): string {
  return (
    {
      pending: 'Заявка ожидает решения',
      going: 'Вы участвуете',
      rejected: 'Заявка отклонена',
      withdrawn: 'Заявка отозвана',
      cancelled: 'Участие отменено',
    }[status] ?? status
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
  tabs: { padding: 16, gap: 8 },
  tab: {
    borderRadius: 16,
    backgroundColor: 'white',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  activeTab: { backgroundColor: '#2457d6' },
  tabText: { color: '#3d4756' },
  activeTabText: { color: 'white', fontWeight: '600' },
  list: { padding: 16, paddingTop: 0, gap: 12 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 18, gap: 7 },
  category: { color: '#2457d6', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700' },
  status: { color: '#5c6470' },
  update: { color: '#b54708', fontWeight: '600' },
  error: { color: '#b42318', paddingHorizontal: 20, paddingBottom: 10 },
  empty: { textAlign: 'center', color: '#5c6470', marginTop: 60 },
});
