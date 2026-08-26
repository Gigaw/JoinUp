import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMyActivities } from '../../../features/activities/activity-queries';
import { calculateAge, formatAge } from '../../../features/profile/age';
import { getApiBaseUrl } from '../../../shared/api/config';
import { useMe } from '../../../shared/profile/use-me';
import { useSession } from '../../../shared/session/session-context';
import {
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
} from '../../../shared/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const categoryIcons: Record<string, IoniconName> = {
  sport: 'football-outline',
  walks: 'walk-outline',
  games: 'dice-outline',
  culture: 'film-outline',
  music: 'musical-notes-outline',
  social: 'people-outline',
  languages: 'language-outline',
  other: 'ellipsis-horizontal',
};

export default function ProfileScreen() {
  const me = useMe();
  const createdActivities = useMyActivities('created');
  const { logout, token } = useSession();

  if (me.isLoading) return <ActivityIndicator style={styles.center} />;
  if (!me.data)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {me.error?.message ?? 'Не удалось загрузить профиль.'}
        </Text>
        <Button title="Повторить" onPress={() => void me.refetch()} />
      </View>
    );

  const initial = (me.data.displayName?.trim() || me.data.email)
    .slice(0, 1)
    .toUpperCase();
  const createdCount = createdActivities.data?.items.length;
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => {
              void Promise.all([me.refetch(), createdActivities.refetch()]);
            }}
            refreshing={me.isRefetching || createdActivities.isRefetching}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        testID="profile-screen"
      >
        <Text style={styles.title}>Профиль</Text>

        <View style={styles.profileHeader} testID="profile-header">
          <ProfileAvatar
            imageUrl={me.data.avatarUrl}
            initial={initial}
            token={token}
          />
          <View style={styles.profileCopy}>
            <Text numberOfLines={1} style={styles.name}>
              {me.data.displayName || 'Ваш профиль'}
            </Text>
            <View style={styles.profileMetaRow}>
              <Ionicons
                accessible={false}
                color={colors.primary}
                name="location-outline"
                size={18}
              />
              <Text numberOfLines={1} style={styles.profileMeta}>
                {me.data.city?.name ?? 'Город не указан'}
              </Text>
            </View>
            {me.data.showAge ? (
              <Text style={styles.profileMeta}>
                {formatAge(calculateAge(me.data.birthDate))}
              </Text>
            ) : null}
            {me.data.bio ? (
              <View style={styles.profileAbout}>
                <Text style={styles.profileAboutTitle}>О себе</Text>
                <Text style={styles.profileBio}>{me.data.bio}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section} testID="profile-interests">
          <Text style={styles.sectionTitle}>Интересы</Text>
          {me.data.interests.length ? (
            <View style={styles.interests}>
              {me.data.interests.map((item) => (
                <View key={item.id} style={styles.interestChip}>
                  <Ionicons
                    accessible={false}
                    color={colors.primary}
                    name={categoryIcons[item.slug] ?? 'pricetag-outline'}
                    size={19}
                  />
                  <Text style={styles.interestText}>{item.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>Интересы пока не выбраны.</Text>
          )}
        </View>

        <View style={styles.menuCard} testID="profile-menu">
          <MenuRow
            icon="person-outline"
            label="Редактировать профиль"
            onPress={() => router.push('/profile/edit')}
            testID="profile-menu-edit"
          />
          <MenuRow
            icon="calendar-outline"
            label="Мои активности"
            meta={createdCount === undefined ? undefined : String(createdCount)}
            onPress={() => router.push('/activities')}
            testID="profile-menu-activities"
          />
          <MenuRow
            icon="lock-closed-outline"
            label="Настройки приватности"
            onPress={() => router.push('/settings')}
            testID="profile-menu-settings"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void logout()}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
          testID="profile-logout"
        >
          <Ionicons
            accessible={false}
            color={colors.danger}
            name="log-out-outline"
            size={28}
          />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileAvatar({
  imageUrl,
  initial,
  token,
}: {
  imageUrl?: string | null;
  initial: string;
  token: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <View style={styles.avatar}>
      {imageUrl && !imageFailed ? (
        <Image
          accessibilityLabel="Фото профиля"
          onError={() => setImageFailed(true)}
          source={{
            uri: resolveImageUrl(imageUrl),
            ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
          }}
          style={styles.avatarImage}
        />
      ) : (
        <Text style={styles.avatarText}>{initial}</Text>
      )}
    </View>
  );
}

function MenuRow({
  icon,
  label,
  meta,
  onPress,
  testID,
}: {
  icon: IoniconName;
  label: string;
  meta?: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
      testID={testID}
    >
      <Ionicons
        accessible={false}
        color={colors.text}
        name={icon}
        size={27}
        style={styles.menuIcon}
      />
      <Text style={styles.menuLabel}>{label}</Text>
      {meta ? <Text style={styles.menuMeta}>{meta}</Text> : null}
      <Ionicons
        accessible={false}
        color={colors.text}
        name="chevron-forward"
        size={25}
      />
    </Pressable>
  );
}

function resolveImageUrl(imageUrl: string): string {
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return `${getApiBaseUrl()}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

const softShadow = {
  elevation: 3,
  shadowColor: '#10231B',
  shadowOffset: { height: 5, width: 0 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
};

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: {
    gap: spacing.xxl,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  title: { color: colors.text, ...typography.pageTitle },
  profileHeader: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.lg,
    ...softShadow,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 88,
  },
  avatarImage: { height: '100%', width: '100%' },
  avatarText: { color: colors.surface, fontSize: 38, fontWeight: '800' },
  profileCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
    paddingTop: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  profileMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  profileMeta: { color: colors.primary, fontSize: 16, lineHeight: 22 },
  profileAbout: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  profileAboutTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  profileBio: { color: colors.text, fontSize: 15, lineHeight: 21 },
  section: { gap: spacing.md },
  sectionTitle: {
    color: colors.text,
    ...typography.sectionTitle,
    fontSize: 24,
  },
  sectionMeta: { color: colors.textMuted, fontSize: 13 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  interestChip: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  interestText: { color: colors.primaryDark, fontSize: 15, fontWeight: '600' },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    ...softShadow,
  },
  menuRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 66,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuIcon: { width: 32 },
  menuLabel: { color: colors.text, flex: 1, fontSize: 16 },
  menuMeta: { color: colors.textMuted, fontSize: 15 },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 66,
    paddingHorizontal: spacing.lg,
    ...softShadow,
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.78 },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  muted: { color: colors.textMuted, lineHeight: 21 },
  error: { color: colors.danger, textAlign: 'center' },
});
