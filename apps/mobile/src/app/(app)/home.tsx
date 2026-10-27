import { ROLE_LABELS, colors, navItemsFor, radii, spacing } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChipGroup } from '@/components/kit';
import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, text } from '@/components/ui';

export default function HomeScreen() {
  const { user, signOut, switchOrganization } = useAuth();
  const [switching, setSwitching] = useState(false);
  if (!user) return null;
  const items = navItemsFor(user.role);

  return (
    <Screen edges={['bottom']}>
      <FadeUp>
        <Text style={text.eyebrow}>{(user.organization?.name ?? 'Platform administration').toUpperCase()}</Text>
      </FadeUp>
      {user.memberships.length > 1 && (
        <ChipGroup
          value={user.organization?.id ?? null}
          onChange={async (id) => {
            if (switching || id === user.organization?.id) return;
            setSwitching(true);
            try {
              await switchOrganization(id);
            } finally {
              setSwitching(false);
            }
          }}
          options={user.memberships.map((m) => ({ value: m.organization.id, label: m.organization.name }))}
        />
      )}
      <FadeUp delay={60}>
        <Text style={text.h1}>Welcome, {user.name.split(' ')[0]}</Text>
      </FadeUp>
      <FadeUp delay={120}>
        <Text style={text.body}>
          You're signed in as <Text style={{ color: colors.ink, fontWeight: '600' }}>{ROLE_LABELS[user.role]}</Text>.
          Here's what you can access.
        </Text>
      </FadeUp>

      <View style={{ gap: spacing.md }}>
        {items.map((item, i) => (
          <FadeUp key={item.key} delay={180 + i * 50}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                item.key === 'volunteers'
                  ? router.push('/volunteers')
                  : item.key === 'settings'
                    ? router.push('/settings')
                    : item.key === 'recruitment'
                      ? router.push('/recruitment')
                      : router.push({ pathname: '/module/[key]', params: { key: item.key } })
              }
              style={({ pressed }) => [pressed && { transform: [{ translateY: 1 }], opacity: 0.9 }]}
            >
              <Card style={{ padding: spacing.lg }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  {item.comingInStep && (
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepText}>Step {item.comingInStep}</Text>
                    </View>
                  )}
                </View>
                <Text style={[text.body, { fontSize: 14, marginTop: 4 }]}>{item.description}</Text>
              </Card>
            </Pressable>
          </FadeUp>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/discover')}
          style={({ pressed }) => [pressed && { transform: [{ translateY: 1 }], opacity: 0.9 }]}
        >
          <Card style={{ padding: spacing.lg }}>
            <Text style={styles.cardTitle}>Find opportunities</Text>
            <Text style={[text.body, { fontSize: 14, marginTop: 4 }]}>Browse volunteer roles from other organisations on Replica</Text>
          </Card>
        </Pressable>
      </View>

      <Card style={{ padding: spacing.lg, gap: 4 }}>
        <Text style={styles.cardTitle}>{user.name}</Text>
        <Text style={text.muted}>{user.email}</Text>
        <Button title="Sign out" variant="secondary" onPress={() => void signOut()} style={{ marginTop: spacing.md }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.ink, fontWeight: '600', fontSize: 16 },
  stepBadge: { backgroundColor: colors.amberSoft, borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 2 },
  stepText: { color: colors.amber, fontSize: 11, fontWeight: '500' },
});
