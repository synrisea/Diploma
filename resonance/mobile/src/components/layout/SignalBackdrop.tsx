import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '../../theme/tokens';

function SignalRing({ cx, cy, radius }: { cx: number; cy: number; radius: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.out(Easing.ease) }), -1, false);
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 1.7 }],
    opacity: 0.3 * (1 - progress.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: cx - radius,
          top: cy - radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: colors.brand[500],
        },
        style,
      ]}
    />
  );
}

export function SignalBackdrop() {
  const { width, height } = useWindowDimensions();
  const cx = width * 0.82;
  const cy = height * 0.15;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="glow" cx={cx} cy={cy} r={Math.max(width, height) * 0.55} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.brand[500]} stopOpacity="0.14" />
            <Stop offset="1" stopColor={colors.brand[500]} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill={colors.ground} />
        <Rect x="0" y="0" width={width} height={height} fill="url(#glow)" />
        <Circle cx={cx} cy={cy} r="90" fill="none" stroke={colors.stone[900]} strokeOpacity="0.07" strokeWidth="1" />
        <Circle cx={cx} cy={cy} r="165" fill="none" stroke={colors.stone[900]} strokeOpacity="0.05" strokeWidth="1" />
        <Circle cx={cx} cy={cy} r="240" fill="none" stroke={colors.stone[900]} strokeOpacity="0.035" strokeWidth="1" />
      </Svg>
      <SignalRing cx={cx} cy={cy} radius={90} />
    </View>
  );
}
