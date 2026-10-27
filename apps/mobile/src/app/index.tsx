import { colors, spacing } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Logo } from '@/components/Logo';
import { FadeUp, PulseDot, Skeleton } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, text } from '@/components/ui';

export default function LandingScreen() {
  const { api } = useAuth();
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 10_000 });

  return (
    <Screen>
      <View style={{ marginBottom: spacing.xl }}>
        <Logo />
      </View>

      <FadeUp>
        <Text style={text.eyebrow}>VOLUNTEER OPERATIONS</Text>
      </FadeUp>
      <FadeUp delay={80}>
        <Text style={[text.h1, { fontSize: 32, lineHeight: 38 }]}>Rotas, reminders and check-ins in one place.</Text>
      </FadeUp>
      <FadeUp delay={160}>
        <Text style={[text.body, { fontSize: 17, lineHeight: 25 }]}>
          Schedule shifts, fill gaps from the waitlist and log hours with a QR scan, on web, iOS and Android.
        </Text>
      </FadeUp>

      <FadeUp delay={200}>
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Button title="Sign in" onPress={() => router.push('/login')} />
          <Button title="Create your organisation" variant="secondary" onPress={() => router.push('/register')} />
        </View>
      </FadeUp>

      <FadeUp delay={240}>
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.cardTitle}>System status</Text>
          {health.isPending ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              <Skeleton style={{ width: '75%' }} />
              <Skeleton style={{ width: '50%' }} />
            </View>
          ) : health.isError ? (
            <StatusRow ok={false} label="API" value="Unreachable" />
          ) : (
            <>
              <StatusRow ok label="API" value="Online" />
              <StatusRow ok={health.data.db === 'up'} label="Database" value={health.data.db === 'up' ? 'Connected' : 'Down'} />
            </>
          )}
        </Card>
      </FadeUp>
    </Screen>
  );
}

function StatusRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  const fg = ok ? colors.green : colors.red;
  return (
    <View style={styles.statusRow}>
      <Text style={text.body}>{label}</Text>
      <View style={[styles.badge, { backgroundColor: ok ? colors.greenSoft : colors.redSoft }]}>
        {ok ? <View style={[styles.dot, { backgroundColor: fg }]} /> : <PulseDot color={fg} />}
        <Text style={[styles.badgeText, { color: fg }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: colors.ink, fontWeight: '600', fontSize: 14 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '500' },
});
