import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEventDetails } from '../../../../features/events/event-queries';
import {
  colors,
  radius,
  spacing,
  typography,
} from '../../../../shared/theme/tokens';

export default function EventParticipantsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const query = useEventDetails(eventId);
  if (query.isLoading) {
    return (
      <ActivityIndicator
        color={colors.primary}
        style={styles.state}
        testID="event-participants-loading"
      />
    );
  }
  if (query.error || !query.data) {
    return (
      <View style={styles.state} testID="event-participants-error">
        <Text style={styles.error}>
          {query.error?.message ?? 'Не удалось загрузить участников.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          style={styles.retry}
        >
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }
  const { participants } = query.data;
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      testID="event-participants-screen"
    >
      <Text style={styles.title}>Участники ({participants.length})</Text>
      <Text style={styles.subtitle}>
        Только подтверждённые участники активности.
      </Text>
      {participants.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons color={colors.textMuted} name="people-outline" size={34} />
          <Text style={styles.emptyText}>
            Подтверждённых участников пока нет.
          </Text>
        </View>
      ) : (
        participants.map((participant) => (
          <Link
            href={{
              pathname: '/users/[userId]',
              params: { userId: participant.id },
            }}
            key={participant.id}
            asChild
          >
            <Pressable
              accessibilityLabel={`Открыть профиль ${participant.displayName}`}
              accessibilityRole="button"
              style={styles.participant}
            >
              <View accessible={false} style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {participant.displayName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.participantCopy}>
                <Text style={styles.participantName}>
                  {participant.displayName}
                </Text>
                {participant.age ? (
                  <Text style={styles.participantMeta}>
                    {participant.age} лет
                  </Text>
                ) : null}
              </View>
              <Ionicons
                color={colors.textMuted}
                name="chevron-forward"
                size={20}
              />
            </Pressable>
          </Link>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.background,
    gap: spacing.md,
    minHeight: '100%',
    padding: spacing.xl,
  },
  state: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { color: colors.text, ...typography.screenTitle },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  participant: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: colors.primaryDark, fontSize: 19, fontWeight: '800' },
  participantCopy: { flex: 1, gap: spacing.xs },
  participantName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  participantMeta: { color: colors.textMuted },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger, textAlign: 'center' },
  retry: {
    borderColor: colors.primary,
    borderRadius: radius.medium,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  retryText: { color: colors.primary, fontWeight: '800' },
});
