import { memo, useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '../../theme/tokens';

export const PIN_BOX = 60;
const COMPACT_PIN_BOX = 48;
const PIN_SIZE = 11;
const SELECTED_PIN_SIZE = 16;
const RING_INSET = 7;
const HIT_FILL = 'rgba(0,0,0,0.01)';

function PulseRing({ color }: { color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false);
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.55 + progress.value * (1.9 - 0.55) }],
    opacity: 0.55 * (1 - progress.value),
  }));

  const size = SELECTED_PIN_SIZE + RING_INSET * 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

export const PlacePin = memo(function PlacePin({ color, selected }: { color: string; selected: boolean }) {
  const size = selected ? SELECTED_PIN_SIZE : PIN_SIZE;
  const ring = size + 4;
  const box = selected ? PIN_BOX : COMPACT_PIN_BOX;

  return (
    <View
      style={{
        width: box,
        height: box,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: HIT_FILL,
      }}
    >
      {selected && <PulseRing color={color} />}
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          backgroundColor: 'rgba(11,10,7,0.92)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: selected ? color : 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: selected ? 0.55 : 0,
          shadowRadius: selected ? 7 : 0,
        }}
      >
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
      </View>
    </View>
  );
});

function clusterTier(count: number) {
  if (count < 10) return { size: 34, background: colors.brand[500], text: colors.brand.ink };
  if (count < 50) return { size: 42, background: colors.brand[600], text: colors.brand.ink };
  return { size: 50, background: colors.brand[700], text: colors.stone[900] };
}

export const ClusterBubble = memo(function ClusterBubble({ count }: { count: number }) {
  const { size, background, text } = clusterTier(count);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        borderWidth: 2,
        borderColor: colors.ground,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: text,
          fontFamily: fonts.monoSemibold,
          fontSize: count < 100 ? 13 : 12,
          fontVariant: ['tabular-nums'],
        }}
      >
        {count}
      </Text>
    </View>
  );
});
