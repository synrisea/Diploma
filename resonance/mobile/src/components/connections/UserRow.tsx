import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { rowCardClass } from '../ui/styles';

interface UserRowProps {
  userId: string;
  displayName: string;
  avatarUrl: string | null | undefined;
  subtitle?: string;
  action?: ReactNode;
  showAvatar?: boolean;
}

export function UserRow({ userId, displayName, avatarUrl, subtitle, action, showAvatar = true }: UserRowProps) {
  const router = useRouter();

  return (
    <View className={rowCardClass}>
      <Pressable
        onPress={() => router.push({ pathname: '/users/[id]', params: { id: userId } })}
        className="min-w-0 flex-1 flex-row items-center gap-2.5 active:opacity-80"
      >
        {showAvatar && <Avatar displayName={displayName} avatarUrl={avatarUrl} size="sm" />}
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-sans-medium text-stone-900">
            {displayName}
          </Text>
          {subtitle && (
            <Text numberOfLines={1} className="font-mono text-[11px] text-stone-500">
              {subtitle}
            </Text>
          )}
        </View>
      </Pressable>
      {action}
    </View>
  );
}
