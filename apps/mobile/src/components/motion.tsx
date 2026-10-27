import { colors, motion } from '@newreplica/shared';
import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: motion.shimmerMs / 2 }),
        withTiming(1, { duration: motion.shimmerMs / 2 }),
      ),
      -1,
    );
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ backgroundColor: colors.lineSoft, borderRadius: 6, height: 14 }, style, animated]} />;
}

export function PulseDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.5, { duration: motion.pulseMs / 2 }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }, animated]} />;
}

export function FadeUp({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      progress.value = withTiming(1, { duration: 500, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    }, delay);
    return () => clearTimeout(t);
  }, [delay, progress]);
  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));
  return <Animated.View style={animated}>{children}</Animated.View>;
}
