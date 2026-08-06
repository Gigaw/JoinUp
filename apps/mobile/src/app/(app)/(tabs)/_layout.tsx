import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../../shared/theme/tokens';

const icons: Record<string, string> = {
  home: '⌂',
  activities: '◷',
  chats: '◌',
  profile: '◉',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 74,
          paddingTop: 7,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, focused }) => (
          <Text
            style={{
              color,
              fontSize: 22,
              fontWeight: focused ? '700' : '400',
            }}
          >
            {icons[route.name]}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Главная' }} />
      <Tabs.Screen name="activities" options={{ title: 'Мои' }} />
      <Tabs.Screen name="chats" options={{ title: 'Чаты' }} />
      <Tabs.Screen name="profile" options={{ title: 'Профиль' }} />
    </Tabs>
  );
}
