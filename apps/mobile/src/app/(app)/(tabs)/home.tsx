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
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventCard } from '../../../features/events/ui/event-card';
import { useEventList } from '../../../features/events/event-queries';
import { useMe } from '../../../shared/profile/use-me';
import {
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
} from '../../../shared/theme/tokens';

export default function HomeScreen() {
  const me = useMe();
  const cityId = me.data?.city?.id;
  const query = useEventList(cityId);
  const isLoading = me.isLoading || (Boolean(cityId) && query.isLoading);
  const blockingError =
    (me.error && !me.data ? me.error : null) ??
    (query.error && !query.data ? query.error : null);

  if (isLoading) return <LoadingState />;
  if (blockingError) {
    return (
      <ErrorState
        message={blockingError.message}
        onRetry={() => {
          void me.refetch();
          void query.refetch();
        }}
      />
    );
  }

  const items = query.data?.items ?? [];
  const inlineError = me.error ?? query.error;
  const retryHome = () => {
    void me.refetch();
    void query.refetch();
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.container}
      testID="events-screen"
    >
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
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <HomeHeader
            cityName={me.data?.city?.name ?? 'Ваш город'}
            errorMessage={inlineError?.message}
            onRetry={retryHome}
          />
        }
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item, index }) => (
          <Link
            href={{
              pathname: '/events/[eventId]',
              params: { eventId: item.id },
            }}
            asChild
          >
            <EventCard
              event={item}
              highlight={index === 0}
              testID={`event-card-${item.id}`}
            />
          </Link>
        )}
      />
    </SafeAreaView>
  );
}

function HomeHeader({
  cityName,
  errorMessage,
  onRetry,
}: {
  cityName: string;
  errorMessage?: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ВМЕСТЕ В ГОРОДЕ</Text>
        <Text style={styles.city}>{cityName}</Text>
        <Text style={styles.title}>Планы на сегодня</Text>
        <Text style={styles.subtitle}>
          Найдите занятие, к которому хочется присоединиться.
        </Text>
      </View>
      <DiscoveryControls />
      {errorMessage ? (
        <InlineError message={errorMessage} onRetry={onRetry} />
      ) : null}
      <Text style={styles.sectionTitle}>Ближайшие активности</Text>
    </View>
  );
}

function DiscoveryControls() {
  return (
    <View style={styles.discoveryControls}>
      <Pressable
        accessibilityLabel="Поиск активностей. Недоступно"
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.searchControl}
        testID="home-search-disabled"
      >
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.controlText}>Поиск активностей</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Фильтры. Недоступно"
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.filterControl}
        testID="home-filters-disabled"
      >
        <Text style={styles.filterText}>Фильтры</Text>
      </Pressable>
      <Text style={styles.controlsHint}>
        Поиск и фильтры появятся в следующем обновлении.
      </Text>
    </View>
  );
}

function LoadingState() {
  return (
    <SafeAreaView edges={['top']} style={styles.state} testID="events-screen">
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateText}>Загружаем активности…</Text>
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
    <SafeAreaView edges={['top']} style={styles.state} testID="events-screen">
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

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Пока нет ближайших активностей</Text>
      <Text style={styles.emptyText}>
        Загляните позже — новые встречи появятся здесь автоматически.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1 },
  list: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  headerContainer: { gap: spacing.md },
  header: { paddingBottom: spacing.sm, paddingTop: spacing.sm },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  city: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  title: { color: colors.text, marginTop: spacing.lg, ...typography.pageTitle },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  discoveryControls: { gap: spacing.sm },
  searchControl: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    color: colors.textMuted,
    fontSize: 22,
    marginRight: spacing.sm,
  },
  controlText: { color: colors.textMuted, fontSize: 15 },
  filterControl: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  filterText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  controlsHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  sectionTitle: {
    color: colors.text,
    marginTop: spacing.sm,
    ...typography.sectionTitle,
  },
  inlineError: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.small,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  inlineErrorText: { color: colors.danger, flex: 1, lineHeight: 19 },
  inlineRetry: { minHeight: touchTarget, justifyContent: 'center' },
  inlineRetryText: { color: colors.danger, fontWeight: '800' },
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
