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
import { EventCard } from '../../../features/events/ui/event-card';
import {
  type ActivitiesTab,
  useMyActivities,
} from '../../../features/activities/activity-queries';
import {
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
} from '../../../shared/theme/tokens';

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

  if (query.isLoading && !query.data) return <LoadingState />;
  if (query.error && !query.data) {
    return (
      <ErrorState
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  }

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
            accessibilityRole="button"
            style={styles.createButton}
            testID="events-create"
          >
            <Text style={styles.createButtonIcon}>+</Text>
          </Pressable>
        </Link>
      </View>
      <View accessibilityRole="tablist" style={styles.filters}>
        {tabs.map((item) => {
          const selected = tab === item.value;
          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={item.value}
              onPress={() => setTab(item.value)}
              style={[styles.tab, selected && styles.activeTab]}
            >
              <Text style={selected ? styles.activeTabText : styles.tabText}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {query.error ? (
        <InlineError
          message={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      <FlatList
        data={query.data?.items ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Здесь пока пусто</Text>
            <Text style={styles.emptyText}>
              Активности из этой вкладки появятся здесь автоматически.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.activityItem} testID={`my-activity-${item.id}`}>
            <Link
              href={{
                pathname: '/events/[eventId]',
                params: { eventId: item.id },
              }}
              asChild
            >
              <EventCard event={item} testID={`event-card-${item.id}`}>
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
              </EventCard>
            </Link>
          </View>
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

function LoadingState() {
  return (
    <SafeAreaView
      edges={['top']}
      style={styles.state}
      testID="my-activities-screen"
    >
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateText}>Загружаем ваши активности…</Text>
    </SafeAreaView>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <SafeAreaView
      edges={['top']}
      style={styles.state}
      testID="my-activities-screen"
    >
      <Text style={styles.stateTitle}>Не удалось загрузить активности</Text>
      <Text style={styles.stateText}>{message}</Text>
      <Pressable
        accessibilityLabel="Повторить загрузку активностей"
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.retryButton}
      >
        <Text style={styles.retryButtonText}>Повторить</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View accessibilityRole="alert" style={styles.inlineError}>
      <Text style={styles.inlineErrorText}>{message}</Text>
      <Pressable
        accessibilityLabel="Повторить обновление списка"
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.inlineRetry}
      >
        <Text style={styles.inlineRetryText}>Повторить</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  screenTitle: { color: colors.text, ...typography.screenTitle },
  createButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  createButtonIcon: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 31,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  tab: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted },
  activeTabText: { color: colors.surface, fontWeight: '700' },
  inlineError: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.small,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  inlineErrorText: { color: colors.danger, flex: 1, lineHeight: 19 },
  inlineRetry: { minHeight: touchTarget, justifyContent: 'center' },
  inlineRetryText: { color: colors.danger, fontWeight: '800' },
  list: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.lg,
  },
  activityItem: { gap: spacing.sm },
  status: { color: colors.textMuted, lineHeight: 20 },
  update: { color: colors.primaryDark, fontWeight: '700', lineHeight: 20 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: { color: colors.textMuted, lineHeight: 21, textAlign: 'center' },
  state: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: { color: colors.textMuted, lineHeight: 21, textAlign: 'center' },
  retryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.small,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: { color: colors.surface, fontWeight: '800' },
});
