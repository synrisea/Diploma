import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_CLASS: Record<AvatarSize, { box: string; text: string; small: boolean }> = {
  xs: { box: 'h-7 w-7', text: 'text-xs', small: true },
  sm: { box: 'h-8 w-8', text: 'text-xs', small: true },
  md: { box: 'h-9 w-9', text: 'text-sm', small: true },
  lg: { box: 'h-10 w-10', text: 'text-sm', small: true },
  xl: { box: 'h-16 w-16', text: 'text-xl', small: false },
  '2xl': { box: 'h-20 w-20', text: 'text-2xl', small: false },
};

interface AvatarProps {
  displayName: string;
  avatarUrl: string | null | undefined;
  size?: AvatarSize;
  shape?: 'round' | 'square';
  className?: string;
}

export function Avatar({ displayName, avatarUrl, size = 'sm', shape = 'round', className }: AvatarProps) {
  const { box, text, small } = SIZE_CLASS[size];
  const initial = displayName.charAt(0).toUpperCase();
  const radius = shape === 'round' ? 'rounded-full' : 'rounded-2xl';
  const uri = avatarUrl ? (small ? avatarUrl.replace('256.webp', '64.webp') : avatarUrl) : null;

  return (
    <View className={`${box} ${radius} shrink-0 items-center justify-center overflow-hidden bg-brand-500 ${className ?? ''}`}>
      {uri ? (
        <Image source={{ uri }} contentFit="cover" style={{ width: '100%', height: '100%' }} transition={120} />
      ) : (
        <Text className={`font-display-medium ${text} text-brand-ink`}>{initial}</Text>
      )}
    </View>
  );
}
