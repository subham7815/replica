import { colors, radii, spacing, type ApplicationStatus } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useApplications } from '@newreplica/shared/queries';
import { Redirect, Stack, router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { ChipGroup, EmptyState } from '@/components/kit';
import { Skeleton } from '@/components/motion';
import { ApplicationStatusBadge } from '@/components/recruitment';
import { Button, Card, FormError, text } from '@/components/ui';

const PAGE_SIZE = 20;

export default function RecruitmentScreen() {
  const { can } = useAuth();
  const [status, setStatus] = useState<ApplicationStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const list = useApplications({ status: status === 'ALL' ? undefined : status, page, pageSize: PAGE_SIZE });
  if (!can('volunteers:manage')) return <Redirect href="/home" />;
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Recruitment',
          headerRight: () => (
            <Pressable accessibilityRole="button" onPress={() => router.push('/recruitment/opportunities')} hitSlop={12}>
              <Text style={{ color: colors.red, fontWeight: '700', fontSize: 16 }}>Roles</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        style={{ backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
        data={list.data?.items ?? []}
        keyExtractor={(a) => a.id}
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isPlaceholderData} onRefresh={() => void list.refetch()} tintColor={colors.red} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            <ChipGroup
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: 'PENDING', label: `Waiting${list.data ? ` (${list.data.pendingTotal})` : ''}` },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Declined' },
                { value: 'ALL', label: 'All' },
              ]}
            />
            <Button title="Manage opportunities" variant="secondary" onPress={() => router.push('/recruitment/opportunities')} />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/recruitment/application/[id]', params: { id: item.id } })}
            style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ translateY: 1 }] }, list.isPlaceholderData && { opacity: 0.6 }]}
          >
            <Card style={{ padding: spacing.lg, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 16, flexShrink: 1 }}>{item.name}</Text>
                <ApplicationStatusBadge status={item.status} />
              </View>
              <Text style={text.muted} numberOfLines={1}>
                {item.opportunity.title} · {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          list.isPending ? (
            <View style={{ gap: spacing.md }}>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} style={{ height: 76, borderRadius: radii.lg }} />
              ))}
            </View>
          ) : list.isError ? (
            <FormError error={list.error} />
          ) : (
            <EmptyState
              title={status === 'PENDING' ? 'Nothing waiting for review' : 'No applications here'}
              body={status === 'PENDING' ? 'New applications for roles that need approval appear here.' : 'Try a different filter.'}
            />
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Button title="Previous" variant="secondary" disabled={page <= 1} onPress={() => setPage((p) => p - 1)} style={{ flex: 1 }} />
              <Text style={text.muted}>
                {page} / {totalPages}
              </Text>
              <Button title="Next" variant="secondary" disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)} style={{ flex: 1 }} />
            </View>
          ) : undefined
        }
      />
    </>
  );
}
