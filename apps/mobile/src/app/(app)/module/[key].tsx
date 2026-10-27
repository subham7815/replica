import { NAV_ITEMS, can, colors, motion, spacing } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Button, Card, text } from '@/components/ui';

export default function ModuleScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { user } = useAuth();
  const item = NAV_ITEMS.find((i) => i.key === key);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: motion.progressMs, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  }, [progress]);
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }], transformOrigin: 'left' }));

  if (!item || !can(user?.role, item.permission)) return <Redirect href="/home" />;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: item.label }} />
      <Text style={text.body}>{item.description}</Text>
      <Card style={{ alignItems: 'center', paddingVertical: 48, gap: spacing.md }}>
        <View style={{ width: 160, height: 4, borderRadius: 2, backgroundColor: colors.lineSoft, overflow: 'hidden' }}>
          <Animated.View style={[{ height: '100%', backgroundColor: colors.red }, bar]} />
        </View>
        <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 16, marginTop: spacing.md }}>
          {item.comingInStep ? `Arrives in build step ${item.comingInStep}` : 'Coming soon'}
        </Text>
        <Text style={[text.muted, { textAlign: 'center' }]}>Your access to this module is already wired up for your role.</Text>
        <Button title="Back to dashboard" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
      </Card>
    </Screen>
  );
}
