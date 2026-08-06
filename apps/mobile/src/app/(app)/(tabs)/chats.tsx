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
import { useMyChats } from '../../../features/chats/chat-queries';
import { colors, radius } from '../../../shared/theme/tokens';

export default function ChatsScreen() {
  const query = useMyChats();
  if (query.isLoading) return <ActivityIndicator style={styles.center} />;
  return (
    <SafeAreaView
      edges={['top']}
      style={styles.container}
      testID="chats-screen"
    >
      <Text style={styles.heading}>Чаты</Text>
      {query.error ? (
        <Text style={styles.error}>{query.error.message}</Text>
      ) : null}
      <FlatList
        data={query.data?.items ?? []}
        keyExtractor={(item) => item.eventId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>У вас пока нет доступных чатов.</Text>
        }
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: '/chats/[eventId]',
              params: { eventId: item.eventId },
            }}
            asChild
          >
            <Pressable style={styles.card} testID={`chat-${item.eventId}`}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{formatDate(item.startsAt)}</Text>
              <View style={styles.footer}>
                <Text style={styles.status}>
                  {item.readOnly ? 'Только чтение' : 'Открыть чат'}
                </Text>
                {item.lastMessageAt ? (
                  <Text style={styles.meta}>Есть сообщения</Text>
                ) : null}
              </View>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
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
  heading: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  list: { gap: 12, padding: 20 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  meta: { color: colors.textMuted },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  status: { color: colors.primary, fontWeight: '700' },
  error: { color: colors.danger, paddingHorizontal: 20, paddingTop: 14 },
  empty: { color: colors.textMuted, marginTop: 60, textAlign: 'center' },
});
