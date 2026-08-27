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
import { usePendingApplications } from '../activity-queries';
import { EventCard } from '../../events/ui/event-card';
import { useLeaveEventMutation } from '../../events/event-mutations';
import { AppError } from '../../../shared/api/error';
import {
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
} from '../../../shared/theme/tokens';

type ActivityItem = components['schemas']['ActivityItemDto'];

export function PendingApplicationsScreen() {
  const query = usePendingApplications();

  if (query.isLoading && !query.data) {
    return <LoadingState />;
  }

  if (query.error && !query.data) {
    return (
      <SafeAreaView style={styles.state} testID="plans-applications-error">
        <Text style={styles.stateTitle}>Не удалось загрузить заявки</Text>
        <Text style={styles.stateText}>{query.error.message}</Text>
        <Pressable
          accessibilityLabel="Повторить загрузку заявок"
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          style={styles.retryButton}
          testID="plans-applications-error-retry"
        >
          <Text style={styles.retryButtonText}>Повторить</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const items = query.data?.items ?? [];

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.screen}
      testID="plans-applications-screen"
    >
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Назад к планам"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backButton}
          testID="plans-applications-back"
        >
          <Ionicons
            accessible={false}
            color={colors.primary}
            name="chevron-back"
            size={28}
          />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Заявки ждут решения</Text>
          <Text style={styles.subtitle}>
            Здесь только ваши исходящие заявки в статусе ожидания.
          </Text>
        </View>
      </View>

      {query.error ? (
        <View accessibilityRole="alert" style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>
            {isOfflineError(query.error)
              ? 'Нет соединения. Показываем сохранённые заявки.'
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
          items.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => <PendingApplicationCard item={item} />}
      />

      {query.isFetching && query.data ? (
        <View pointerEvents="none" style={styles.fetching}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function PendingApplicationCard({ item }: { item: ActivityItem }) {
  const mutation = useLeaveEventMutation(item.id);

  return (
    <View style={styles.activityItem} testID={`pending-application-${item.id}`}>
      <EventCard
        event={item}
        showCity
        onPress={() =>
          router.push({
            pathname: '/events/[eventId]',
            params: { eventId: item.id },
          })
        }
        testID={`pending-application-card-${item.id}`}
      >
        <Text style={styles.pendingStatus}>Заявка ожидает решения</Text>
        {mutation.error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {mutation.error.message}
          </Text>
        ) : null}
        <Pressable
          accessibilityLabel={`Отозвать заявку на активность ${item.title}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: mutation.isPending }}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate()}
          style={({ pressed }) => [
            styles.withdrawButton,
            mutation.isPending && styles.withdrawButtonDisabled,
            pressed && !mutation.isPending && styles.pressed,
          ]}
          testID={`pending-application-withdraw-${item.id}`}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.withdrawText}>Отозвать заявку</Text>
          )}
        </Pressable>
      </EventCard>
    </View>
  );
}

function LoadingState() {
  return (
    <SafeAreaView style={styles.state} testID="plans-applications-loading">
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateText}>Загружаем заявки…</Text>
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty} testID="plans-applications-empty">
      <Ionicons
        accessible={false}
        color={colors.textMuted}
        name="checkmark-circle-outline"
        size={40}
      />
      <Text style={styles.emptyTitle}>Нет заявок, ожидающих решения</Text>
      <Text style={styles.emptyText}>
        После отправки заявки она появится здесь до ответа организатора.
      </Text>
    </View>
  );
}

function isOfflineError(error: unknown): boolean {
  return error instanceof AppError && error.code === 'NETWORK_ERROR';
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget,
    minWidth: touchTarget,
  },
  headerCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  title: { color: colors.text, ...typography.screenTitle },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 22 },
  inlineError: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.small,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  inlineErrorText: { color: colors.danger, lineHeight: 20 },
  list: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.lg,
  },
  emptyList: { flexGrow: 1 },
  activityItem: { gap: spacing.sm },
  pendingStatus: {
    color: colors.primaryDark,
    fontWeight: '800',
    lineHeight: 20,
  },
  error: { color: colors.danger, lineHeight: 20 },
  withdrawButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: radius.small,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
  withdrawButtonDisabled: { opacity: 0.6 },
  withdrawText: { color: colors.primary, fontWeight: '800' },
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
