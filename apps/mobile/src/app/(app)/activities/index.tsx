import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { memo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
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

const CREATE_BUTTON_HEIGHT = 48;

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
        <View style={styles.titleBlock}>
          <Text style={styles.screenTitle}>Мои активности</Text>
          <Text style={styles.subtitle}>Ваши планы и созданные встречи</Text>
        </View>
      </View>
      <ActivitiesFilters tab={tab} onTabChange={setTab} />
      {query.error ? (
        <InlineError
          message={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      <View style={styles.listViewport}>
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
          style={styles.listFlatList}
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
                <EventCard
                  event={item}
                  showCity
                  testID={`event-card-${item.id}`}
                >
                  {item.myParticipation &&
                  item.myParticipation.status !== 'going' ? (
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
                    <Text style={styles.update}>
                      Есть изменения в активности
                    </Text>
                  ) : null}
                </EventCard>
              </Link>
            </View>
          )}
        />
        {query.isFetching && query.isPlaceholderData ? (
          <View pointerEvents="none" style={styles.listFetching}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : null}
      </View>
      <CreateActivityButton />
    </SafeAreaView>
  );
}

type ActivitiesFiltersProps = {
  onTabChange: (tab: ActivitiesTab) => void;
  tab: ActivitiesTab;
};

const ActivitiesFilters = memo(function ActivitiesFilters({
  onTabChange,
  tab,
}: ActivitiesFiltersProps) {
  const [filtersMetrics, setFiltersMetrics] = useState({
    contentWidth: 0,
    offsetX: 0,
    viewportWidth: 0,
  });
  const filtersEndOffset =
    filtersMetrics.contentWidth - filtersMetrics.viewportWidth;
  const showFiltersChevron =
    filtersEndOffset > 0 && filtersMetrics.offsetX < filtersEndOffset - 1;

  return (
    <View accessibilityRole="tablist" style={styles.filters}>
      <View style={styles.filtersRow}>
        <ScrollView
          contentContainerStyle={styles.filtersContent}
          horizontal
          onContentSizeChange={(contentWidth) =>
            setFiltersMetrics((current) => ({ ...current, contentWidth }))
          }
          onLayout={({ nativeEvent }) =>
            setFiltersMetrics((current) => ({
              ...current,
              viewportWidth: nativeEvent.layout.width,
            }))
          }
          onScroll={({ nativeEvent }) =>
            setFiltersMetrics((current) => ({
              ...current,
              offsetX: nativeEvent.contentOffset.x,
            }))
          }
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
          {tabs.map((item) => {
            const selected = tab === item.value;

            return (
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={item.value}
                onPress={() => onTabChange(item.value)}
                style={[styles.tab, selected && styles.activeTab]}
              >
                <Text
                  numberOfLines={1}
                  style={selected ? styles.activeTabText : styles.tabText}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {showFiltersChevron ? (
          <View pointerEvents="none" style={styles.filtersChevron}>
            <Ionicons
              accessible={false}
              color={colors.textMuted}
              name="chevron-forward"
              size={24}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
});

function participationLabel(status: string): string {
  return (
    {
      pending: 'Заявка ожидает решения',
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
      <CreateActivityButton />
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
      <CreateActivityButton />
    </SafeAreaView>
  );
}

function CreateActivityButton() {
  const router = useRouter();

  return (
    <View pointerEvents="box-none" style={styles.floatingLayer}>
      <Pressable
        accessibilityLabel="Создать активность"
        accessibilityRole="button"
        onPress={() => router.push('/events/create')}
        style={({ pressed }) => [
          styles.createButton,
          pressed && styles.createButtonPressed,
        ]}
        testID="events-create"
      >
        <Ionicons
          accessible={false}
          color={colors.surface}
          name="add"
          size={20}
        />
        <Text style={styles.createButtonText}>Создать</Text>
      </Pressable>
    </View>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  titleBlock: { minWidth: 0 },
  screenTitle: { color: colors.text, ...typography.screenTitle },
  subtitle: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    bottom: spacing.xl,
    elevation: 12,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: CREATE_BUTTON_HEIGHT,
    paddingHorizontal: spacing.lg,
    position: 'absolute',
    right: spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    zIndex: 12,
  },
  createButtonPressed: { opacity: 0.82 },
  createButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  filters: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  filtersRow: {
    position: 'relative',
  },
  filtersScroll: { flexGrow: 0 },
  filtersContent: { gap: spacing.sm, paddingRight: spacing.xxxl },
  filtersChevron: {
    alignItems: 'center',
    backgroundColor: colors.background,
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: spacing.xxxl,
  },
  floatingLayer: {
    bottom: 0,
    elevation: 12,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 12,
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
  tabText: { color: colors.textMuted, fontSize: 16 },
  activeTabText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
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
    paddingBottom: spacing.xxxl + CREATE_BUTTON_HEIGHT + spacing.xl,
    paddingTop: spacing.lg,
  },
  listViewport: {
    flex: 1,
    marginTop: spacing.md,
    position: 'relative',
  },
  listFlatList: { flex: 1 },
  listFetching: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: spacing.sm,
    position: 'absolute',
    right: spacing.xl,
    top: spacing.sm,
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
