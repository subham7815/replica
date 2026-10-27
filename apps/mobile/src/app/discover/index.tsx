import { colors, radii, spacing } from '@newreplica/shared';
import { useDebouncedValue, useDiscover } from '@newreplica/shared/queries';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState } from '@/components/kit';
import { Skeleton } from '@/components/motion';
import { OpportunityCard } from '@/components/recruitment';
import { Button, FormError, text } from '@/components/ui';

const PAGE_SIZE = 20;

export default function DiscoverScreen() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const term = useDebouncedValue(q.trim());
  const list = useDiscover({ q: term || undefined, page, pageSize: PAGE_SIZE });
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Find opportunities', headerShadowVisible: false, headerTintColor: colors.ink }} />
      <FlatList
        style={{ backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
        data={list.data?.items ?? []}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isPlaceholderData} onRefresh={() => void list.refetch()} tintColor={colors.red} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            <Text style={text.body}>Browse roles from community groups and apply in a couple of minutes. No account needed.</Text>
            <TextInput
              value={q}
              onChangeText={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder="Search by role, organisation or place"
              placeholderTextColor={colors.faint}
              style={styles.search}
              accessibilityLabel="Search opportunities"
            />
            {list.data && (
              <Text style={text.muted}>
                {list.data.total} open {list.data.total === 1 ? 'role' : 'roles'}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={list.isPlaceholderData ? { opacity: 0.6 } : undefined}>
            <OpportunityCard opp={item} onPress={() => router.push({ pathname: '/opportunity/[id]', params: { id: item.id } })} />
          </View>
        )}
        ListEmptyComponent={
          list.isPending ? (
            <View style={{ gap: spacing.md }}>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} style={{ height: 160, borderRadius: radii.lg }} />
              ))}
            </View>
          ) : list.isError ? (
            <FormError error={list.error} />
          ) : (
            <EmptyState
              title={term ? 'No roles match your search' : 'No open roles yet'}
              body={term ? 'Try a different word or place.' : 'Check back soon.'}
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

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
});
