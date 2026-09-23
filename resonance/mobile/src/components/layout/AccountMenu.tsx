import { forwardRef, type RefObject } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAuth } from '../../auth/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useIsAdmin } from '../../hooks/useAdmin';
import { SheetMenu } from './SheetMenu';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';

function MenuItem({ label, onPress, tone = 'default' }: { label: string; onPress: () => void; tone?: 'default' | 'danger' }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="menuitem" className="px-5 py-3.5 active:bg-stone-900/5">
      <Text className={`text-base ${tone === 'danger' ? 'text-sentiment-negative' : 'text-stone-600'}`}>{label}</Text>
    </Pressable>
  );
}

export const AccountMenu = forwardRef<BottomSheetModal>(function AccountMenu(_, ref) {
  const router = useRouter();
  const { displayName, email, logout } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();

  const close = () => (ref as RefObject<BottomSheetModal | null>).current?.dismiss();
  const go = (href: Href) => {
    close();
    router.push(href);
  };

  return (
    <SheetMenu ref={ref}>
      <View className="flex-row items-center gap-3 px-5 py-3">
        <Avatar displayName={displayName ?? '?'} avatarUrl={profile?.avatarUrl} size="lg" shape="square" />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-sans-medium text-stone-900">
            {displayName}
          </Text>
          <Text numberOfLines={1} className="font-mono text-xs text-stone-500">
            {email}
          </Text>
        </View>
      </View>
      <View className="my-1 border-t border-stone-900/10" />
      <MenuItem label="Settings" onPress={() => go('/settings')} />
      {isAdmin && <MenuItem label="Admin" onPress={() => go('/admin')} />}
      <View className="my-1 border-t border-stone-900/10" />
      <MenuItem
        label="Log out"
        onPress={() => {
          close();
          logout();
        }}
      />
    </SheetMenu>
  );
});
