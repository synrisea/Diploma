import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useFriendRequests } from '../../hooks/useFriendRequests';
import { Text } from '../ui/Text';
import { FriendsIcon, InboxIcon, MapIcon, PlansIcon } from '../ui/icons';
import { colors, shadows } from '../../theme/tokens';

interface TabRoute {
  key: string;
  name: string;
}

interface TabMeta {
  label: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
}

const TAB_META: Record<string, TabMeta> = {
  index: { label: 'Map', Icon: MapIcon },
  inbox: { label: 'Inbox', Icon: InboxIcon },
  friends: { label: 'Friends', Icon: FriendsIcon },
  plans: { label: 'Plans', Icon: PlansIcon },
};

export function TabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unreadCount = useUnreadCount();
  const { data: friendRequests = [] } = useFriendRequests();
  const incomingRequestCount = friendRequests.filter((r) => r.isIncoming).length;

  const visibleRoutes = (state.routes as TabRoute[]).filter((route) => {
    const href = (descriptors[route.key]?.options as { href?: unknown } | undefined)?.href;
    return href !== null;
  });

  if (visibleRoutes.length <= 1) return null;

  return (
    <View
      className="flex-row border-t border-stone-900/10 bg-panel/95"
      style={[{ paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8 }, shadows.panel]}
    >
      {visibleRoutes.map((route) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const isFocused = state.routes[state.index]?.key === route.key;
        const color = isFocused ? colors.brand[500] : colors.stone[500];

        const badge =
          route.name === 'inbox' && unreadCount > 0 ? (
            <View className="absolute -right-2.5 -top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1">
              <Text className="font-mono-medium text-[10px] text-brand-ink">{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : route.name === 'friends' && incomingRequestCount > 0 ? (
            <View className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand-500" style={shadows.brandGlow} />
          ) : null;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={
              route.name === 'inbox' && unreadCount > 0 ? `Inbox, ${unreadCount} unread` : meta.label
            }
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            className="flex-1 items-center gap-1 py-1 active:opacity-75"
          >
            <View className="relative h-6 w-6 items-center justify-center">
              <meta.Icon size={18} color={color} />
              {badge}
            </View>
            <Text className={`font-mono text-[10px] uppercase tracking-[1px] ${isFocused ? 'text-brand-500' : 'text-stone-500'}`}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
