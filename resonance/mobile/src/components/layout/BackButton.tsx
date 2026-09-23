import { Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Text } from '../ui/Text';
import { ChevronLeftIcon } from '../ui/icons';
import { shadows } from '../../theme/tokens';

export function BackButton({ fallback = '/' as Href }: { fallback?: Href }) {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };

  return (
    <Pressable
      onPress={goBack}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
      className="flex-row items-center gap-1.5 self-start rounded-full border border-stone-900/10 bg-panel/90 px-3 py-1.5 active:opacity-75"
      style={shadows.pill}
    >
      <ChevronLeftIcon />
      <Text className="font-mono text-[11px] uppercase tracking-[1px] text-stone-500">Back</Text>
    </Pressable>
  );
}
