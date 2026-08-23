import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EventCard } from '../../../features/events/ui/event-card';
import { usePublicUser } from '../../../features/profile/use-public-user';
import { getApiBaseUrl } from '../../../shared/api/config';
import {
  colors,
  radius,
  spacing,
  typography,
} from '../../../shared/theme/tokens';

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const query = usePublicUser(userId);

  if (query.isLoading) {
    return (
      <View style={styles.state} testID="public-profile-loading">
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Загружаем профиль…</Text>
      </View>
    );
  }
  if (query.error || !query.data) {
    return (
      <View style={styles.state} testID="public-profile-error">
        <Ionicons color={colors.danger} name="alert-circle-outline" size={36} />
        <Text style={styles.error}>
          {query.error?.message ?? 'Профиль не найден.'}
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

  const profile = query.data;
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      testID="public-profile-screen"
    >
      <View style={styles.profileCard}>
        <ProfileAvatar
          imageUrl={profile.avatarUrl}
          name={profile.displayName}
        />
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.meta}>
            {[profile.age ? `${profile.age} лет` : null, profile.city?.name]
              .filter(Boolean)
              .join(' · ') || 'Город не указан'}
          </Text>
        </View>
      </View>
      {profile.bio ? (
        <View style={styles.bioCard}>
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Интересы</Text>
        {profile.interests.length ? (
          <View style={styles.chips}>
            {profile.interests.map((interest) => (
              <View key={interest.id} style={styles.chip}>
                <Text style={styles.chipText}>{interest.name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>Интересы не указаны.</Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ближайшие активности</Text>
        {profile.upcomingEvents.length ? (
          profile.upcomingEvents.map((event) => (
            <EventCard
              event={event}
              key={event.id}
              onPress={() =>
                router.push({
                  pathname: '/events/[eventId]',
                  params: { eventId: event.id },
                })
              }
              showCity
            />
          ))
        ) : (
          <Text style={styles.muted}>
            Ближайших опубликованных активностей пока нет.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function ProfileAvatar({
  imageUrl,
  name,
}: {
  imageUrl?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) {
    return (
      <Image
        accessibilityLabel={`Аватар ${name}`}
        onError={() => setFailed(true)}
        source={{ uri: resolveImageUrl(imageUrl) }}
        style={styles.avatarImage}
      />
    );
  }
  return (
    <View
      accessibilityLabel={`Аватар ${name}`}
      accessible
      style={styles.avatarFallback}
    >
      <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

function resolveImageUrl(imageUrl: string): string {
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return `${getApiBaseUrl()}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.background,
    gap: spacing.xl,
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
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.large,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  avatarImage: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 76,
    width: 76,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  avatarText: { color: colors.text, fontSize: 30, fontWeight: '800' },
  profileCopy: { flex: 1, gap: spacing.xs },
  name: { color: colors.text, ...typography.sectionTitle },
  meta: { color: colors.textMuted, lineHeight: 20 },
  bioCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    padding: spacing.lg,
  },
  bio: { color: colors.text, lineHeight: 23 },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.text, ...typography.sectionTitle },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.primaryDark, fontWeight: '700' },
  muted: { color: colors.textMuted, lineHeight: 20 },
  error: { color: colors.danger, textAlign: 'center' },
  retry: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: radius.medium,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  retryText: { color: colors.primary, fontWeight: '800' },
});
