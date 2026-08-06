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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type ActivitiesTab,
  useMyActivities,
} from '../../../features/activities/activity-queries';
import { colors, radius } from '../../../shared/theme/tokens';

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
    <SafeAreaView
      edges={['top']}
      style={styles.container}
      testID="my-activities-screen"
    >
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Мои активности</Text>
        <Link href="/events/create" asChild>
          <Pressable
            accessibilityLabel="Создать активность"
            style={styles.createButton}
            testID="events-create"
          >
            <Text style={styles.createButtonIcon}>+</Text>
          </Pressable>
        </Link>
      </View>
      <View style={styles.filters}>
        {tabs.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setTab(item.value)}
            style={[styles.tab, tab === item.value && styles.activeTab]}
          >
            <Text
              style={tab === item.value ? styles.activeTabText : styles.tabText}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
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
    </SafeAreaView>
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
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  screenTitle: { color: colors.text, fontSize: 30, fontWeight: '800' },
  createButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  createButtonIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 31,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  tab: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted },
  activeTabText: { color: '#fff', fontWeight: '700' },
  list: { padding: 20, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: 7,
    padding: 18,
  },
  category: { color: colors.primary, fontWeight: '700' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  status: { color: colors.textMuted },
  update: { color: colors.primaryDark, fontWeight: '700' },
  error: { color: colors.danger, paddingHorizontal: 20, paddingTop: 14 },
  empty: { color: colors.textMuted, marginTop: 60, textAlign: 'center' },
});
