import { Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';

export function PhotoStrip({
  urls,
  onExpand,
  size = 64,
}: {
  urls: string[];
  onExpand?: (url: string) => void;
  size?: number;
}) {
  if (urls.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2" contentContainerClassName="gap-1.5">
      {urls.map((url) => (
        <Pressable
          key={url}
          onPress={onExpand ? () => onExpand(url) : undefined}
          disabled={!onExpand}
          accessibilityRole="imagebutton"
          accessibilityLabel="Open photo"
          className="overflow-hidden rounded-lg border border-stone-900/10 active:opacity-75"
          style={{ width: size, height: size }}
        >
          <Image source={{ uri: url }} contentFit="cover" style={{ width: '100%', height: '100%' }} transition={120} />
        </Pressable>
      ))}
    </ScrollView>
  );
}
