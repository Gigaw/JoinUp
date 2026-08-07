import { router } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateAge, formatAge } from '../../../features/profile/age';
import { useMe } from '../../../shared/profile/use-me';
import { colors, radius } from '../../../shared/theme/tokens';

export default function ProfileScreen() {
  const me = useMe();
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
  return (
    <SafeAreaView
      edges={['top']}
      style={styles.container}
      testID="profile-screen"
    >
      <Text style={styles.title}>Профиль</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>
            {me.data.displayName || 'Ваш профиль'}
          </Text>
          <Text style={styles.city}>
            {me.data.city?.name ?? 'Город не указан'}
          </Text>
          {me.data.showAge ? (
            <Text style={styles.age}>
              {formatAge(calculateAge(me.data.birthDate))}
            </Text>
          ) : null}
        </View>
      </View>
      {me.data.bio ? <Text style={styles.bio}>{me.data.bio}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/profile/edit')}
        style={styles.primaryAction}
        testID="profile-edit"
      >
        <Text style={styles.primaryActionText}>Редактировать профиль</Text>
      </Pressable>
      <Text style={styles.label}>ИНТЕРЕСЫ</Text>
      <View style={styles.interests}>
        {me.data.interests.length ? (
          me.data.interests.map((item) => (
            <View key={item.id} style={styles.chip}>
              <Text style={styles.chipText}>{item.name}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>Интересы пока не выбраны</Text>
        )}
      </View>
      <View style={styles.settingsCard}>
        <Text style={styles.infoTitle}>Аккаунт</Text>
        <Text style={styles.email}>{me.data.email}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={styles.settingsAction}
          testID="profile-settings"
        >
          <Text style={styles.settingsActionText}>Настройки</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: 18,
    padding: 20,
    paddingTop: 38,
  },
  center: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.large,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 15,
    padding: 18,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  avatarText: { color: colors.text, fontSize: 25, fontWeight: '800' },
  profileCopy: { gap: 4 },
  name: { color: colors.text, fontSize: 20, fontWeight: '800' },
  city: { color: colors.textMuted },
  age: { color: colors.textMuted },
  bio: { color: colors.textMuted, lineHeight: 21 },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    padding: 15,
  },
  primaryActionText: { color: colors.surface, fontWeight: '700' },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  settingsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: 8,
    padding: 17,
  },
  infoTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  email: { color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, lineHeight: 20 },
  settingsAction: {
    alignItems: 'flex-start',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 6,
    paddingTop: 15,
  },
  settingsActionText: { color: colors.primary, fontWeight: '700' },
  error: { color: colors.danger, textAlign: 'center' },
});
