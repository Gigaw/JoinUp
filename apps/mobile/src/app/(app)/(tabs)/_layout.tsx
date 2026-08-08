import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors } from '../../../shared/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type TabScreenOptionsArgs = { route: { name: string } };
type TabBarIconProps = { color: string; focused: boolean; size: number };

const icons: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  home: { active: 'home', inactive: 'home-outline' },
  activities: { active: 'calendar', inactive: 'calendar-outline' },
  chats: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }: TabScreenOptionsArgs) => ({
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
        tabBarIcon: ({ color, focused }: TabBarIconProps) => {
          const routeName = route.name;
          const icon = icons[routeName] ?? icons.home;

          return (
            <Ionicons
              accessible={false}
              color={color}
              name={icon[focused ? 'active' : 'inactive']}
              size={24}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Главная' }} />
      <Tabs.Screen name="activities" options={{ title: 'Мои' }} />
      <Tabs.Screen name="chats" options={{ title: 'Чаты' }} />
      <Tabs.Screen name="profile" options={{ title: 'Профиль' }} />
    </Tabs>
  );
}
