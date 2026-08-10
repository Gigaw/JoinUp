import { Ionicons } from '@expo/vector-icons';
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
import { useCategories } from '../../../features/categories/use-categories';
import { CityPickerSheet } from '../../../features/cities/ui/city-picker-sheet';
import { useCities } from '../../../features/cities/use-cities';
import { EventCard } from '../../../features/events/ui/event-card';
import { useEventList } from '../../../features/events/event-queries';
import { FilterBottomSheet } from '../../../features/events/ui/filter-bottom-sheet';
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
  const [discoveryCityId, setDiscoveryCityId] = useState<string>();
  const [isCitySheetOpen, setCitySheetOpen] = useState(false);
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const profileCityId = me.data?.city?.id;
  const cityId = discoveryCityId ?? profileCityId;
  const cities = useCities();
  const categories = useCategories();
  const selectedCity = cities.data?.find((city) => city.id === cityId);
  const query = useEventList(cityId, selectedCategoryIds);
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
            cityName={selectedCity?.name ?? me.data?.city?.name ?? 'Ваш город'}
            errorMessage={inlineError?.message}
            onCityPress={() => setCitySheetOpen(true)}
            onFilterPress={() => setFilterSheetOpen(true)}
            onRetry={retryHome}
            filterCount={selectedCategoryIds.length}
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
      <CityPickerSheet
        cities={cities.data ?? []}
        error={cities.error}
        isLoading={cities.isPending}
        isOpen={isCitySheetOpen}
        onClose={() => setCitySheetOpen(false)}
        onRetry={() => void cities.refetch()}
        onSelect={(selectedId) => {
          setDiscoveryCityId(selectedId);
          setCitySheetOpen(false);
        }}
        selectedCityId={cityId}
      />
      <FilterBottomSheet
        categories={categories.data ?? []}
        error={categories.error}
        isLoading={categories.isPending}
        isOpen={isFilterSheetOpen}
        onApply={(categoryIds) => {
          setSelectedCategoryIds(categoryIds);
          setFilterSheetOpen(false);
        }}
        onClose={() => setFilterSheetOpen(false)}
        onRetry={() => void categories.refetch()}
        selectedCategoryIds={selectedCategoryIds}
      />
    </SafeAreaView>
  );
}

function HomeHeader({
  cityName,
  errorMessage,
  filterCount,
  onFilterPress,
  onCityPress,
  onRetry,
}: {
  cityName: string;
  errorMessage?: string;
  filterCount: number;
  onFilterPress: () => void;
  onCityPress: () => void;
  onRetry: () => void;
}) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={styles.cityRow}>
          <Pressable
            accessibilityLabel={`Город: ${cityName}. Выбрать город`}
            accessibilityRole="button"
            onPress={onCityPress}
            style={styles.cityInfo}
            testID="home-city-selector"
          >
            <Ionicons
              accessible={false}
              color={colors.primary}
              name="location-outline"
              size={20}
            />
            <Text style={styles.city}>{cityName}</Text>
            <Ionicons
              accessible={false}
              color={colors.textMuted}
              name="chevron-down"
              size={16}
            />
          </Pressable>
          <View style={styles.headerActions}>
            <HeaderIconButton
              accessibilityLabel="Поиск активностей. Недоступно"
              disabled
              icon="search-outline"
              testID="home-search-disabled"
            />
            <HeaderIconButton
              accessibilityLabel="Открыть фильтры активностей"
              icon="options-outline"
              onPress={onFilterPress}
              badgeCount={filterCount}
              testID="home-filters-button"
            />
          </View>
        </View>
        <Text style={styles.title}>Активности в городе</Text>
        <Text style={styles.subtitle}>
          Найдите занятие, к которому хочется присоединиться.
        </Text>
      </View>
      {errorMessage ? (
        <InlineError message={errorMessage} onRetry={onRetry} />
      ) : null}
    </View>
  );
}

function HeaderIconButton({
  accessibilityLabel,
  badgeCount = 0,
  disabled = false,
  icon,
  onPress,
  testID,
}: {
  accessibilityLabel: string;
  badgeCount?: number;
  disabled?: boolean;
  icon: 'options-outline' | 'search-outline';
  onPress?: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerAction,
        disabled && styles.headerActionDisabled,
        pressed && !disabled && styles.headerActionPressed,
      ]}
      testID={testID}
    >
      <Ionicons accessible={false} color={colors.text} name={icon} size={21} />
      {badgeCount > 0 ? (
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
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
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  headerContainer: { gap: spacing.md },
  header: { paddingBottom: spacing.xs, paddingTop: 0 },
  cityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cityInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.sm,
  },
  city: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  headerAction: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  headerActionDisabled: { opacity: 0.65 },
  headerActionPressed: { backgroundColor: colors.surfaceMuted },
  headerBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.background,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  headerBadgeText: { color: colors.surface, fontSize: 11, fontWeight: '800' },
  title: { color: colors.text, marginTop: spacing.md, ...typography.pageTitle },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: spacing.sm,
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
