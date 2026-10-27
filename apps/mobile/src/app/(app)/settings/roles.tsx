import { ORG_ROLES, PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS, ROLE_PERMISSIONS, colors, spacing } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Card, text } from '@/components/ui';

export default function RolesScreen() {
  const { can } = useAuth();
  if (!can('org:manage')) return <Redirect href="/home" />;

  return (
    <Screen edges={['bottom']}>
      <Text style={text.body}>What each role can do. Every action is checked on the server.</Text>
      {ORG_ROLES.map((role) => (
        <Card key={role} style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>{ROLE_LABELS[role]}</Text>
          {PERMISSIONS.filter((p) => p !== 'tenants:manage').map((p) => {
            const has = ROLE_PERMISSIONS[role].includes(p);
            return (
              <View key={p} style={{ flexDirection: 'row', gap: spacing.sm, opacity: has ? 1 : 0.45 }}>
                <Text style={{ color: has ? colors.green : colors.faint, fontWeight: '700', width: 16 }}>{has ? '✓' : '–'}</Text>
                <Text style={[text.body, { flex: 1, fontSize: 14 }]}>{PERMISSION_LABELS[p]}</Text>
              </View>
            );
          })}
        </Card>
      ))}
      <Text style={text.muted}>Roles are fixed for now. Limiting access by location or programme is planned.</Text>
    </Screen>
  );
}
