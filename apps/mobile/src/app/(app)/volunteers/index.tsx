import { MEMBER_STATUSES, MEMBER_STATUS_LABELS, colors, radii, spacing, type MemberStatus } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useDebouncedValue, useDepartments, useVolunteers } from '@newreplica/shared/queries';
import { File, Paths } from 'expo-file-system';
import { Redirect, Stack, router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChipGroup, EmptyState, ListRow, StatusBadge } from '@/components/kit';
import { Skeleton } from '@/components/motion';
import { Button, FormError, text } from '@/components/ui';

const PAGE_SIZE = 25;

export default function VolunteersScreen() {
  const { api, can } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<MemberStatus | 'ALL'>('ALL');
  const [departmentId, setDepartmentId] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);

  const filters = {
    q: useDebouncedValue(q.trim()) || undefined,
    status: status === 'ALL' ? undefined : status,
    departmentId: departmentId === 'ALL' ? undefined : departmentId,
  };
  const list = useVolunteers({ ...filters, page, pageSize: PAGE_SIZE });
  const departments = useDepartments();

  if (!can('volunteers:manage')) return <Redirect href="/home" />;

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;
  const filtered = !!(filters.q || filters.status || filters.departmentId);

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      const csv = await api.exportVolunteersCsv(filters);
      const file = new File(Paths.cache, `volunteers-${new Date().toISOString().slice(0, 10)}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Export volunteers' });
    } catch (err) {
      setExportError(err);
    } finally {
      setExporting(false);
    }
  }

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <View style={styles.search}>
        <TextInput
          value={q}
          onChangeText={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Search name, email, phone or skill"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          style={styles.searchInput}
          accessibilityLabel="Search volunteers"
        />
      </View>
      <ChipGroup
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        options={[{ value: 'ALL' as const, label: 'All' }, ...MEMBER_STATUSES.map((s) => ({ value: s, label: MEMBER_STATUS_LABELS[s] }))]}
      />
      {!!departments.data?.length && (
        <ChipGroup
          value={departmentId}
          onChange={(v) => {
            setDepartmentId(v);
            setPage(1);
          }}
          options={[{ value: 'ALL', label: 'All departments' }, ...departments.data.map((d) => ({ value: d.id, label: d.name }))]}
        />
      )}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button title="Import CSV" variant="secondary" onPress={() => router.push('/volunteers/import')} style={{ flex: 1 }} />
        <Button title="Export CSV" variant="secondary" onPress={exportCsv} loading={exporting} style={{ flex: 1 }} />
      </View>
      <FormError error={exportError} />
      {list.data && (
        <Text style={text.muted}>
          {list.data.total} {list.data.total === 1 ? 'volunteer' : 'volunteers'}
          {filtered ? ' match your filters' : ''}
        </Text>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Volunteers',
          headerRight: () => (
            <Pressable accessibilityRole="button" onPress={() => router.push('/volunteers/new')} hitSlop={12}>
              <Text style={{ color: colors.red, fontWeight: '700', fontSize: 16 }}>+ Add</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        style={{ backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        data={list.data?.items ?? []}
        keyExtractor={(v) => v.id}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isPlaceholderData} onRefresh={() => void list.refetch()} tintColor={colors.red} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.lineSoft }} />}
        renderItem={({ item, index }) => (
          <View
            style={[
              { overflow: 'hidden', borderColor: colors.line, borderLeftWidth: 1, borderRightWidth: 1 },
              index === 0 && { borderTopWidth: 1, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
              index === (list.data?.items.length ?? 0) - 1 && { borderBottomWidth: 1, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
              list.isPlaceholderData && { opacity: 0.6 },
            ]}
          >
            <ListRow
              title={item.name}
              subtitle={[item.email, item.departments.map((d) => d.name).join(', ')].filter(Boolean).join(' · ')}
              right={<StatusBadge status={item.status} />}
              onPress={() => router.push({ pathname: '/volunteers/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          list.isPending ? (
            <View style={{ gap: spacing.sm }}>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} style={{ height: 52, borderRadius: radii.md }} />
              ))}
            </View>
          ) : list.isError ? (
            <FormError error={list.error} />
          ) : filtered ? (
            <EmptyState title="No volunteers match" body="Try a different search or clear the filters." />
          ) : (
            <EmptyState title="No volunteers yet" body="Add people one at a time, or import a spreadsheet.">
              <Button title="Add volunteer" onPress={() => router.push('/volunteers/new')} />
            </EmptyState>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pager}>
              <Button title="Previous" variant="secondary" disabled={page <= 1} onPress={() => setPage((p) => p - 1)} style={{ flex: 1 }} />
              <Text style={text.muted}>
                {page} / {totalPages}
              </Text>
              <Button title="Next" variant="secondary" disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)} style={{ flex: 1 }} />
            </View>
          ) : list.isFetching && !list.isPending ? (
            <ActivityIndicator color={colors.red} style={{ marginTop: spacing.lg }} />
          ) : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  search: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md },
  searchInput: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  pager: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
});
