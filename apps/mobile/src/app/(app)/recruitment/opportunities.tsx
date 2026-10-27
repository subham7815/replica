import { colors, spacing } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useOpportunities } from '@newreplica/shared/queries';
import { Redirect, Stack, router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { EmptyState } from '@/components/kit';
import { OpportunityStatusBadge } from '@/components/recruitment';
import { Screen } from '@/components/Screen';
import { Button, Card, FormError, text } from '@/components/ui';
import { shareOpportunity } from '@/features/share';

export default function OpportunitiesScreen() {
  const { can } = useAuth();
  const list = useOpportunities();
  if (!can('volunteers:manage')) return <Redirect href="/home" />;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Opportunities',
          headerRight: () => (
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/recruitment/opportunity/[id]', params: { id: 'new' } })} hitSlop={12}>
              <Text style={{ color: colors.red, fontWeight: '700', fontSize: 16 }}>+ New</Text>
            </Pressable>
          ),
        }}
      />
      {list.isPending ? (
        <ActivityIndicator color={colors.red} />
      ) : list.isError ? (
        <FormError error={list.error} />
      ) : list.data.length === 0 ? (
        <EmptyState title="No opportunities yet" body="Describe a volunteer role, publish it, and share the link.">
          <Button title="Create your first opportunity" onPress={() => router.push({ pathname: '/recruitment/opportunity/[id]', params: { id: 'new' } })} />
        </EmptyState>
      ) : (
        list.data.map((o) => (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/recruitment/opportunity/[id]', params: { id: o.id } })}
            style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ translateY: 1 }] }]}
          >
            <Card style={{ padding: spacing.lg, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16, flexShrink: 1 }}>{o.title}</Text>
                <OpportunityStatusBadge status={o.status} />
              </View>
              <Text style={[text.body, { fontSize: 14 }]} numberOfLines={2}>
                {o.summary}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }}>
                <Text style={{ fontSize: 13 }}>
                  <Text style={{ color: o.pendingCount ? colors.amber : colors.muted, fontWeight: '600' }}>{o.pendingCount} waiting</Text>
                  <Text style={{ color: colors.muted }}> · </Text>
                  <Text style={{ color: colors.green, fontWeight: '600' }}>{o.approvedCount} joined</Text>
                </Text>
                {o.status === 'PUBLISHED' && (
                  <Text accessibilityRole="button" onPress={() => shareOpportunity(o.id, o.title)} style={{ color: colors.red, fontWeight: '600' }}>
                    Share link
                  </Text>
                )}
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
