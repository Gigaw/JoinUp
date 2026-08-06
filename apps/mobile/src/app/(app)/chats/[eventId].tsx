import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateMessageMutation } from '../../../features/chats/chat-mutations';
import { useEventMessages } from '../../../features/chats/chat-queries';
import { colors, radius } from '../../../shared/theme/tokens';

export default function EventChatScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const query = useEventMessages(eventId);
  const create = useCreateMessageMutation(eventId);
  const [text, setText] = useState('');
  const messages = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const readOnly = query.data?.pages[0]?.readOnly ?? false;

  if (query.isLoading) return <ActivityIndicator style={styles.center} />;
  if (query.error)
    return <Text style={styles.error}>{query.error.message}</Text>;

  const submit = () => {
    const value = text.trim();
    if (!value || create.isPending || readOnly) return;
    create.mutate(value, { onSuccess: () => setText('') });
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={styles.container}
      testID="event-chat-screen"
    >
      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Сообщений пока нет. Начните организацию встречи.
          </Text>
        }
        ListHeaderComponent={
          query.hasNextPage ? (
            <Pressable
              disabled={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
              style={styles.moreButton}
            >
              <Text style={styles.moreText}>
                {query.isFetchingNextPage
                  ? 'Загружаем…'
                  : 'Показать ранние сообщения'}
              </Text>
            </Pressable>
          ) : null
        }
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => void query.refetch()}
        renderItem={({ item }) => (
          <View style={styles.message}>
            <Text style={styles.author}>{item.author.displayName}</Text>
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>
        )}
      />
      {readOnly ? (
        <Text style={styles.readOnly}>Чат доступен только для чтения.</Text>
      ) : null}
      {create.error ? (
        <Text style={styles.error}>{create.error.message}</Text>
      ) : null}
      {!readOnly ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              editable={!create.isPending}
              maxLength={1000}
              multiline
              placeholder="Напишите сообщение"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              testID="event-chat-input"
            />
            <Pressable
              accessibilityLabel="Отправить сообщение"
              disabled={!text.trim() || create.isPending}
              onPress={submit}
              style={[
                styles.sendButton,
                (!text.trim() || create.isPending) && styles.disabledButton,
              ]}
              testID="event-chat-send"
            >
              <Text style={styles.sendText}>
                {create.isPending ? '…' : '↑'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </SafeAreaView>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1 },
  center: { flex: 1 },
  list: { gap: 10, padding: 16 },
  message: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },
  author: { color: colors.primary, fontWeight: '800' },
  messageText: { color: colors.text, fontSize: 16, lineHeight: 22 },
  time: { color: colors.textMuted, fontSize: 12, textAlign: 'right' },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.small,
    color: colors.text,
    flex: 1,
    maxHeight: 120,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  disabledButton: { opacity: 0.45 },
  sendText: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 27 },
  readOnly: { color: colors.textMuted, padding: 14, textAlign: 'center' },
  moreButton: { alignSelf: 'center', padding: 8 },
  moreText: { color: colors.primary, fontWeight: '700' },
  empty: {
    color: colors.textMuted,
    marginTop: 60,
    textAlign: 'center',
    transform: [{ scaleY: -1 }],
  },
  error: { color: colors.danger, padding: 16 },
});
