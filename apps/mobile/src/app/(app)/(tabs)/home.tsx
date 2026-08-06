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
import { useEventList } from '../../../features/events/event-queries';
import { useMe } from '../../../shared/profile/use-me';
import { colors, radius } from '../../../shared/theme/tokens';

export default function HomeScreen() {
  const me = useMe();
  const query = useEventList(me.data?.city?.id);
  if (me.isLoading || query.isLoading)
    return <ActivityIndicator style={styles.center} />;

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.container}
      testID="events-screen"
    >
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
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>
                  {me.data?.city?.name ?? 'Ваш город'}
                </Text>
                <Text style={styles.title}>Планы на сегодня</Text>
                <Text style={styles.subtitle}>
                  Выбирайте занятие, а компания найдётся.
                </Text>
              </View>
            </View>
            {me.error || query.error ? (
              <Text style={styles.error}>
                {(me.error ?? query.error)?.message}
              </Text>
            ) : null}
            <Text style={styles.sectionTitle}>Ближайшие активности</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Пока нет будущих активностей. Создайте первую — люди смогут к ней
            присоединиться.
          </Text>
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
              <View style={styles.cardTop}>
                <Text style={styles.category}>{item.category.name}</Text>
                <Text style={styles.capacity}>
                  {item.participantsCount}/{item.capacity}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.meta}>◷ {formatDate(item.startsAt)}</Text>
              <Text style={styles.meta}>⌖ {item.meetingPlace}</Text>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1 },
  list: { padding: 20, gap: 12, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 24,
    paddingTop: 20,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 7,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: 9,
    padding: 17,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  capacity: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  meta: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, marginBottom: 16 },
  empty: {
    color: colors.textMuted,
    lineHeight: 21,
    marginTop: 30,
    textAlign: 'center',
  },
});
