import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { components } from '@vmeste/api-client';
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
import { type ActivitiesScope, useMyActivities } from '../activity-queries';
import { EventCard } from '../../events/ui/event-card';
import { AppError } from '../../../shared/api/error';
import {
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
} from '../../../shared/theme/tokens';

type ActivityItem = components['schemas']['ActivityItemDto'];

type ActivitiesListScreenProps = {
  scope: ActivitiesScope;
  title: string;
  subtitle: string;
  testID: string;
  archiveRoute: '/plans/archive' | '/organizing/archive';
  emptyTitle: string;
  emptyText: string;
  showPendingSummary?: boolean;
  showCreateAction?: boolean;
  showBackAction?: boolean;
  showArchiveAction?: boolean;
};

export function ActivitiesListScreen({
  scope,
  title,
  subtitle,
  testID,
  archiveRoute,
  emptyTitle,
  emptyText,
  showPendingSummary = false,
  showCreateAction = false,
  showBackAction = false,
  showArchiveAction = true,
}: ActivitiesListScreenProps) {
  const query = useMyActivities(scope);

  if (query.isLoading && !query.data) {
    return <LoadingState testID={`${testID}-loading`} />;
  }

  if (query.error && !query.data) {
    return (
      <ErrorState
        message={query.error.message}
        onRetry={() => void query.refetch()}
        testID={`${testID}-error`}
      />
    );
  }

  const items = query.data?.items ?? [];
  const pendingCount = query.data?.pendingOutgoingApplicationsCount ?? 0;
  const incomingPendingCount =
    query.data?.pendingIncomingApplicationsCount ?? 0;

  return (
    <SafeAreaView edges={['top']} style={styles.screen} testID={testID}>
      <View style={styles.header}>
        {showBackAction ? (
          <Pressable
            accessibilityLabel="Назад"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.backButton}
            testID={`${testID}-back`}
          >
            <Ionicons
              accessible={false}
              color={colors.primary}
              name="chevron-back"
              size={28}
            />
          </Pressable>
        ) : null}
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.headerActions}>
            {showArchiveAction ? (
              <Pressable
                accessibilityLabel="Открыть архив"
                accessibilityRole="button"
                onPress={() => router.push(archiveRoute)}
                style={({ pressed }) => [
                  styles.archiveAction,
                  pressed && styles.pressed,
                ]}
                testID={`${testID}-archive`}
              >
                <Text style={styles.archiveActionText}>Архив</Text>
                <Ionicons
                  accessible={false}
                  color={colors.primary}
                  name="chevron-forward"
                  size={20}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {showPendingSummary && pendingCount > 0 ? (
        <Pressable
          accessibilityHint="Открыть список исходящих заявок, ожидающих решения"
          accessibilityLabel={`Заявки ждут решения: ${pendingCount}`}
          accessibilityRole="button"
          onPress={() => router.push('/plans/applications')}
          style={({ pressed }) => [
            styles.pendingSummary,
            pressed && styles.pressed,
          ]}
          testID="plans-pending-summary"
        >
          <View style={styles.summaryIcon}>
            <Ionicons
              accessible={false}
              color={colors.primary}
              name="time-outline"
              size={23}
            />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>
              Заявки ждут решения: {pendingCount}
            </Text>
            <Text style={styles.summaryText}>Открыть список заявок</Text>
          </View>
          <Ionicons
            accessible={false}
            color={colors.primary}
            name="chevron-forward"
            size={22}
          />
        </Pressable>
      ) : null}

      {scope === 'organizing' && incomingPendingCount > 0 ? (
        <OrganizerReviewSummary count={incomingPendingCount} items={items} />
      ) : null}

      {query.error ? (
        <View accessibilityRole="alert" style={styles.inlineError}>
          <Ionicons
            accessible={false}
            color={colors.danger}
            name="cloud-offline-outline"
            size={19}
          />
          <Text style={styles.inlineErrorText}>
            {isOfflineError(query.error)
              ? 'Нет соединения. Показываем сохранённые данные.'
              : query.error.message}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.list,
          showCreateAction && styles.listWithFloatingAction,
          items.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={
          <EmptyState
            title={emptyTitle}
            text={emptyText}
            testID={`${testID}-empty`}
          />
        }
        renderItem={({ item, index }) => (
          <ActivityListItem
            item={item}
            index={index}
            mode={scope}
            testID={`${testID}-activity-${item.id}`}
          />
        )}
      />

      {showCreateAction ? (
        <Pressable
          accessibilityHint="Открыть форму создания новой активности"
          accessibilityLabel="Создать активность"
          accessibilityRole="button"
          onPress={() => router.push('/events/create')}
          style={({ pressed }) => [
            styles.floatingCreateAction,
            pressed && styles.pressed,
          ]}
          testID={`${testID}-create`}
        >
          <Ionicons
            accessible={false}
            color={colors.surface}
            name="add"
            size={20}
          />
          <Text style={styles.createActionText}>Создать активность</Text>
        </Pressable>
      ) : null}

      {query.isFetching && query.data ? (
        <View pointerEvents="none" style={styles.fetching}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function OrganizerReviewSummary({
  count,
  items,
}: {
  count: number;
  items: ActivityItem[];
}) {
  const pendingItems = items.filter(
    (item) => (item.pendingApplicationsCount ?? 0) > 0,
  );
  const firstEvent = pendingItems[0];

  return (
    <Pressable
      accessibilityHint={
        firstEvent
          ? `Открыть активность ${firstEvent.title} и обработать заявки`
          : undefined
      }
      accessibilityLabel={`Требуют решения: ${count}`}
      accessibilityRole="button"
      disabled={!firstEvent}
      onPress={() => {
        if (firstEvent) {
          router.push({
            pathname: '/events/[eventId]',
            params: { eventId: firstEvent.id },
          });
        }
      }}
      style={({ pressed }) => [
        styles.reviewSummary,
        pressed && firstEvent && styles.pressed,
      ]}
      testID="organizing-review-summary"
    >
      <View style={styles.summaryIcon}>
        <Ionicons
          accessible={false}
          color={colors.primary}
          name="notifications-outline"
          size={23}
        />
      </View>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryTitle}>Требуют решения: {count}</Text>
        <Text style={styles.summaryText}>
          Откройте активность, чтобы принять или отклонить заявки
        </Text>
      </View>
      {firstEvent ? (
        <Ionicons
          accessible={false}
          color={colors.primary}
          name="chevron-forward"
          size={22}
        />
      ) : null}
    </Pressable>
  );
}

function ActivityListItem({
  item,
  index,
  mode,
  testID,
}: {
  item: ActivityItem;
  index: number;
  mode: ActivitiesScope;
  testID: string;
}) {
  const isPlans = mode === 'plans';
  const isOrganizing = mode === 'organizing' || mode === 'organizing_archive';
  const isArchive = mode === 'archive' || mode === 'organizing_archive';

  return (
    <View style={styles.activityItem}>
      {isPlans && index === 0 ? (
        <Text style={styles.sectionLabel}>Ближайшая активность</Text>
      ) : null}
      {isPlans && index === 1 ? (
        <Text style={styles.sectionLabel}>Другие планы</Text>
      ) : null}
      <EventCard
        event={item}
        showCity
        onPress={() => openEvent(item.id)}
        testID={testID}
      >
        {isOrganizing &&
        !isArchive &&
        (item.pendingApplicationsCount ?? 0) > 0 ? (
          <Text style={styles.pendingBadge} testID={`${testID}-applications`}>
            Новых заявок: {item.pendingApplicationsCount}
          </Text>
        ) : null}
        {isArchive ? (
          <Text style={styles.status}>{archiveStatusLabel(item)}</Text>
        ) : null}
        {item.hasEventUpdates ? (
          <Text style={styles.update}>Есть изменения в активности</Text>
        ) : null}
      </EventCard>
    </View>
  );
}

function openEvent(eventId: string) {
  router.push({ pathname: '/events/[eventId]', params: { eventId } });
}

function archiveStatusLabel(item: ActivityItem): string {
  const participation = item.myParticipation?.status;
  if (item.status === 'cancelled') return 'Активность отменена';
  if (participation === 'rejected') return 'Заявка отклонена';
  if (participation === 'withdrawn') return 'Заявка отозвана';
  if (participation === 'cancelled') return 'Участие отменено';
  if (item.status === 'completed' || new Date(item.startsAt) <= new Date()) {
    return 'Активность завершена';
  }
  return 'В архиве';
}

function LoadingState({ testID }: { testID: string }) {
  return (
    <SafeAreaView
      accessibilityLabel="Загрузка активностей"
      style={styles.state}
      testID={testID}
    >
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateText}>Загружаем активности…</Text>
    </SafeAreaView>
  );
}

function ErrorState({
  message,
  onRetry,
  testID,
}: {
  message: string;
  onRetry: () => void;
  testID: string;
}) {
  return (
    <SafeAreaView style={styles.state} testID={testID}>
      <Ionicons
        accessible={false}
        color={colors.danger}
        name="cloud-offline-outline"
        size={30}
      />
      <Text style={styles.stateTitle}>Не удалось загрузить активности</Text>
      <Text style={styles.stateText}>{message}</Text>
      <Pressable
        accessibilityLabel="Повторить загрузку активностей"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
        testID={`${testID}-retry`}
      >
        <Text style={styles.retryButtonText}>Повторить</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function EmptyState({
  title,
  text,
  testID,
}: {
  title: string;
  text: string;
  testID: string;
}) {
  return (
    <View style={styles.empty} testID={testID}>
      <Ionicons
        accessible={false}
        color={colors.textMuted}
        name="calendar-clear-outline"
        size={38}
      />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function isOfflineError(error: unknown): boolean {
  return error instanceof AppError && error.code === 'NETWORK_ERROR';
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  backButton: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget,
    minWidth: touchTarget,
  },
  title: { color: colors.text, ...typography.pageTitle },
  subtitle: { color: colors.textMuted, fontSize: 17, lineHeight: 24 },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  floatingCreateAction: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    bottom: spacing.xl,
    elevation: 5,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    position: 'absolute',
    right: spacing.xl,
    shadowColor: colors.text,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 5,
  },
  createActionText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  archiveAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: touchTarget,
    paddingHorizontal: spacing.xs,
  },
  archiveActionText: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  pendingSummary: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.medium,
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  reviewSummary: {
    alignItems: 'center',
    backgroundColor: colors.accent + '24',
    borderRadius: radius.medium,
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  summaryCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  summaryTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  summaryText: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
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
  list: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.lg,
  },
  listWithFloatingAction: { paddingBottom: spacing.xxxl + 72 },
  emptyList: { flexGrow: 1 },
  activityItem: { gap: spacing.sm },
  sectionLabel: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  pendingBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.small,
    color: colors.primaryDark,
    fontWeight: '800',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  status: { color: colors.textMuted, lineHeight: 20 },
  update: { color: colors.primaryDark, fontWeight: '700', lineHeight: 20 },
  fetching: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: spacing.sm,
    position: 'absolute',
    right: spacing.xl,
    top: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
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
  pressed: { opacity: 0.78 },
});
