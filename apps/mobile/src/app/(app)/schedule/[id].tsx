import {
  addDays,
  colors,
  formatDay,
  formatTimeRange,
  radii,
  shiftInput,
  spacing,
  todayIn,
  type EventDetail,
  type RosterEntry,
  type StaffShift,
} from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import {
  useAssignToShift,
  useCancelEvent,
  useCoverCandidates,
  useDebouncedValue,
  useDeleteEvent,
  useDeleteShift,
  useEvent,
  useRemoveAssignment,
  useSaveEvent,
  useSaveShift,
  useVolunteers,
} from '@newreplica/shared/queries';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChipGroup, EmptyState, Sheet, ToggleRow } from '@/components/kit';
import { EventStatusBadge, FillBar, PlacesLabel, Tag } from '@/components/schedule';
import { Screen } from '@/components/Screen';
import { Button, Card, Field, FormError, fieldErrors, text } from '@/components/ui';

type SheetState = { kind: 'shift'; shift?: StaffShift } | { kind: 'assign'; shift: StaffShift } | { kind: 'cancelEvent' } | null;

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const event = useEvent(id);
  const publish = useSaveEvent();
  const deleteEvent = useDeleteEvent();
  const [sheet, setSheet] = useState<SheetState>(null);

  if (!can('shifts:manage')) return <Redirect href="/home" />;
  if (event.isPending || event.isError) {
    return <Screen edges={['bottom']}>{event.isPending ? <ActivityIndicator color={colors.red} /> : <FormError error={event.error} />}</Screen>;
  }

  const e = event.data;
  const live = e.status !== 'CANCELLED';
  const canEditEvent = can('programmes:manage');

  function confirmDelete() {
    const people = live ? e.confirmedCount + e.waitlistCount : 0;
    Alert.alert(
      'Delete this event?',
      `Its shifts and rota history are removed for good.${people ? ` ${people} signed-up ${people === 1 ? 'person is' : 'people are'} emailed.` : ''} To keep a record, cancel it instead.`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEvent.mutate(e.id, { onSuccess: () => router.back() }) },
      ],
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: e.title,
          headerRight:
            canEditEvent && live
              ? () => (
                  <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.push({ pathname: '/schedule/edit/[id]', params: { id: e.id } })}>
                    <Text style={{ color: colors.red, fontWeight: '700', fontSize: 16 }}>Edit</Text>
                  </Pressable>
                )
              : undefined,
        }}
      />

      <View style={{ gap: 6 }}>
        <EventStatusBadge status={e.status} />
        <Text style={text.muted}>{[e.location?.name, e.department?.name, `Times in ${e.timezone.replace(/_/g, ' ')}`].filter(Boolean).join(' · ')}</Text>
        {e.description ? <Text style={text.body}>{e.description}</Text> : null}
      </View>

      {e.status === 'DRAFT' && (
        <View style={[styles.banner, { backgroundColor: colors.amberSoft, borderColor: '#9a4a0040' }]}>
          <Text style={{ color: colors.amber }}>Draft: volunteers can’t see this event until you publish it.</Text>
          {canEditEvent && (
            <Button
              title={e.shifts.length ? 'Publish' : 'Add a shift to publish'}
              disabled={!e.shifts.length}
              loading={publish.isPending}
              onPress={() => publish.mutate({ id: e.id, input: { title: e.title, status: 'PUBLISHED' } })}
            />
          )}
        </View>
      )}
      <FormError error={publish.error ?? deleteEvent.error} />
      {e.status === 'CANCELLED' && (
        <View style={[styles.banner, { backgroundColor: colors.redSoft, borderColor: '#c7102c33' }]}>
          <Text style={{ color: colors.redDeep }}>This event was cancelled. Everyone with a place was emailed.</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat label="Filled" value={`${e.confirmedCount}/${e.capacity}`} />
        <Stat label="Open" value={e.openSpots} color={e.openSpots && live ? colors.red : undefined} />
        <Stat label="Waiting" value={e.waitlistCount} color={e.waitlistCount ? colors.amber : undefined} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18 }}>Shifts</Text>
        {live && (
          <Pressable accessibilityRole="button" onPress={() => setSheet({ kind: 'shift' })} hitSlop={12}>
            <Text style={text.link}>+ Add shift</Text>
          </Pressable>
        )}
      </View>

      {e.shifts.length === 0 ? (
        <EmptyState title="No shifts yet" body="Add a shift for each role and time slot, with how many people you need.">
          {live && <Button title="Add the first shift" onPress={() => setSheet({ kind: 'shift' })} />}
        </EmptyState>
      ) : (
        e.shifts.map((s, i) => (
          <View key={s.id} style={{ gap: spacing.sm }}>
            {(i === 0 || e.shifts[i - 1]!.date !== s.date) && <Text style={styles.dayHeading}>{formatDay(s.startsAt, e.timezone).toUpperCase()}</Text>}
            <ShiftCard shift={s} event={e} live={live} onEdit={() => setSheet({ kind: 'shift', shift: s })} onAssign={() => setSheet({ kind: 'assign', shift: s })} />
          </View>
        ))
      )}

      {canEditEvent && (
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {live && <Button title="Cancel event" variant="secondary" onPress={() => setSheet({ kind: 'cancelEvent' })} />}
          <Button title="Delete event" variant="secondary" onPress={confirmDelete} loading={deleteEvent.isPending} />
        </View>
      )}

      {sheet?.kind === 'shift' && <ShiftSheet event={e} shift={sheet.shift} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'assign' && <AssignSheet event={e} shift={sheet.shift} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'cancelEvent' && <CancelEventSheet event={e} onClose={() => setSheet(null)} />}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card style={{ flex: 1, padding: spacing.md, gap: 2 }}>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: color ?? colors.ink, fontSize: 22, fontWeight: '700' }}>{value}</Text>
    </Card>
  );
}

function ShiftCard({ shift, event, live, onEdit, onAssign }: { shift: StaffShift; event: EventDetail; live: boolean; onEdit: () => void; onAssign: () => void }) {
  const remove = useRemoveAssignment();
  const del = useDeleteShift();
  const [showCancelled, setShowCancelled] = useState(false);
  const editable = live && new Date(shift.endsAt) > new Date();
  const active = shift.roster.filter((r) => r.status !== 'CANCELLED');
  const cancelled = shift.roster.filter((r) => r.status === 'CANCELLED');

  function confirmRemove(r: RosterEntry) {
    const promotes = r.status === 'CONFIRMED' && shift.waitlistCount > 0;
    Alert.alert(`Remove ${r.name}?`, `They’ll be emailed that they’re off this shift.${promotes ? ' The first person on the waitlist takes their place.' : ''}`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate({ id: r.id }) },
    ]);
  }

  function confirmDelete() {
    const people = shift.confirmedCount + shift.waitlistCount;
    Alert.alert(`Delete “${shift.title}”?`, people ? `${people} ${people === 1 ? 'person is' : 'people are'} on it and will be emailed.` : 'Nobody has signed up yet.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(shift.id) },
    ]);
  }

  return (
    <Card style={{ padding: spacing.lg, gap: spacing.sm, borderColor: shift.spotsLeft && editable ? '#c7102c40' : colors.line }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>{shift.title}</Text>
          <Text style={text.body}>{formatTimeRange(shift.startsAt, shift.endsAt, event.timezone)}</Text>
        </View>
        {live && (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Text accessibilityRole="button" onPress={onEdit} style={text.link}>
              Edit
            </Text>
            <Text accessibilityRole="button" onPress={confirmDelete} style={[text.link, { color: colors.muted }]}>
              Delete
            </Text>
          </View>
        )}
      </View>
      {shift.notes ? <Text style={text.muted}>{shift.notes}</Text> : null}
      <FillBar confirmed={shift.confirmedCount} capacity={shift.capacity} />
      <PlacesLabel confirmed={shift.confirmedCount} capacity={shift.capacity} waitlist={shift.waitlistCount} />
      <FormError error={remove.error ?? del.error} />

      <View style={{ marginTop: 4 }}>
        {active.length === 0 && <Text style={text.muted}>Nobody signed up yet.</Text>}
        {active.map((r) => (
          <RosterRow key={r.id} entry={r} onRemove={editable ? () => confirmRemove(r) : undefined} />
        ))}
        {cancelled.length > 0 && (
          <Text accessibilityRole="button" onPress={() => setShowCancelled((v) => !v)} style={[text.muted, { marginTop: 6, fontWeight: '600' }]}>
            {showCancelled ? 'Hide' : 'Show'} {cancelled.length} cancellation{cancelled.length === 1 ? '' : 's'}
          </Text>
        )}
        {showCancelled && cancelled.map((r) => <RosterRow key={r.id} entry={r} />)}
      </View>

      {editable && <Button title={shift.spotsLeft ? `Find cover (${shift.spotsLeft} open)` : 'Add to waitlist'} variant={shift.spotsLeft ? 'primary' : 'secondary'} onPress={onAssign} />}
    </Card>
  );
}

function RosterRow({ entry, onRemove }: { entry: RosterEntry; onRemove?: () => void }) {
  const cancelled = entry.status === 'CANCELLED';
  return (
    <View style={styles.rosterRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.name, cancelled && { color: colors.muted, textDecorationLine: 'line-through' }]} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={text.muted} numberOfLines={1}>
          {cancelled && entry.cancelReason ? entry.cancelReason : (entry.phone ?? entry.email)}
        </Text>
      </View>
      {entry.waitlistPosition ? <Tag label={`Waitlist #${entry.waitlistPosition}`} /> : null}
      {entry.promotedAt && !cancelled ? <Tag label="From waitlist" /> : null}
      {entry.lateCancel ? <Tag tone="red" label="Late" /> : null}
      {onRemove && (
        <Text accessibilityRole="button" onPress={onRemove} style={{ color: colors.muted, fontWeight: '600', fontSize: 13 }}>
          Remove
        </Text>
      )}
    </View>
  );
}

// ---------- sheets ----------

function nextDays(tz: string, n = 14) {
  const today = todayIn(tz);
  return Array.from({ length: n }, (_, i) => addDays(today, i));
}

function ShiftSheet({ event, shift, onClose }: { event: EventDetail; shift?: StaffShift; onClose: () => void }) {
  const save = useSaveShift();
  const last = event.shifts.at(-1);
  const [form, setForm] = useState(() =>
    shift
      ? { title: shift.title, date: shift.date, startTime: shift.startTime, endTime: shift.endTime, capacity: String(shift.capacity), waitlistEnabled: shift.waitlistEnabled, notes: shift.notes ?? '' }
      : { title: '', date: last?.date ?? addDays(todayIn(event.timezone), 1), startTime: last?.endTime ?? '09:00', endTime: '', capacity: '4', waitlistEnabled: true, notes: '' },
  );
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const set = (key: 'title' | 'date' | 'startTime' | 'endTime' | 'capacity' | 'notes') => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const overnight = !!form.endTime && form.endTime < form.startTime;

  function submit() {
    const { data, errors } = fieldErrors(shiftInput, form);
    setErrors(errors);
    if (data) save.mutate({ eventId: event.id, id: shift?.id, input: data }, { onSuccess: onClose });
  }

  return (
    <Sheet visible title={shift ? 'Edit shift' : 'Add a shift'} onClose={onClose}>
      <Field label="Role" value={form.title} onChangeText={set('title')} placeholder="e.g. Sorting, Front desk" error={errors?.title} />
      <ChipGroup
        label="Date"
        value={form.date}
        onChange={set('date')}
        options={[...new Set([form.date, ...nextDays(event.timezone)])].sort().map((d) => ({ value: d, label: formatDay(`${d}T12:00:00Z`, 'UTC') }))}
      />
      <Field label="Or type a date" value={form.date} onChangeText={set('date')} placeholder="YYYY-MM-DD" autoCapitalize="none" error={errors?.date} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Starts" value={form.startTime} onChangeText={set('startTime')} placeholder="09:00" keyboardType="numbers-and-punctuation" error={errors?.startTime} />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Ends"
            value={form.endTime}
            onChangeText={set('endTime')}
            placeholder="12:00"
            keyboardType="numbers-and-punctuation"
            error={errors?.endTime}
            hint={overnight ? 'Ends the next day' : undefined}
          />
        </View>
      </View>
      <Field label="People needed" value={form.capacity} onChangeText={set('capacity')} keyboardType="number-pad" error={errors?.capacity} />
      <ToggleRow label="Waitlist when full" value={form.waitlistEnabled} onChange={(v) => setForm((f) => ({ ...f, waitlistEnabled: v }))} />
      <Field label="Notes for volunteers" value={form.notes} onChangeText={set('notes')} multiline error={errors?.notes} />
      <Text style={text.muted}>Times are in {event.timezone.replace(/_/g, ' ')}. Changing the time emails everyone on the shift.</Text>
      <FormError error={save.error} />
      <Button title={shift ? 'Save shift' : 'Add shift'} onPress={submit} loading={save.isPending} />
    </Sheet>
  );
}

function AssignSheet({ event, shift, onClose }: { event: EventDetail; shift: StaffShift; onClose: () => void }) {
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q.trim());
  const candidates = useCoverCandidates(shift.id);
  const search = useVolunteers({ q: query || undefined, pageSize: 10 });
  const assign = useAssignToShift();
  const [added, setAdded] = useState<string[]>([]);
  const onShift = new Set([...shift.roster.filter((r) => r.status !== 'CANCELLED').map((r) => r.volunteerId), ...added]);
  const add = (volunteerId: string) => assign.mutate({ shiftId: shift.id, input: { volunteerId } }, { onSuccess: () => setAdded((a) => [...a, volunteerId]) });

  const rows = query
    ? (search.data?.items ?? []).map((v) => ({ id: v.id, name: v.name, detail: v.phone ?? v.email, tags: [] as string[] }))
    : (candidates.data ?? []).map((c) => ({
        id: c.volunteerId,
        name: c.name,
        detail: c.phone ?? c.email,
        tags: [c.available && 'Usually free', c.inDepartment && event.department?.name, `${c.upcomingShifts} upcoming`].filter(Boolean) as string[],
      }));
  const loading = query ? search.isPending : candidates.isPending;

  return (
    <Sheet visible title={`${shift.title} · ${formatDay(shift.startsAt, event.timezone)}`} onClose={onClose}>
      <Text style={text.body}>
        {shift.spotsLeft ? `${shift.spotsLeft} open. People you add are confirmed and emailed.` : 'Full. People you add join the waitlist.'}
      </Text>
      <Field label="Search volunteers" value={q} onChangeText={setQ} placeholder="Name, email or phone" autoCapitalize="none" />
      <Text style={styles.dayHeading}>{query ? 'RESULTS' : 'SUGGESTED COVER'}</Text>
      <FormError error={assign.error ?? (query ? search.error : candidates.error)} />
      {loading ? (
        <ActivityIndicator color={colors.red} />
      ) : rows.length === 0 ? (
        <Text style={text.muted}>{query ? 'No volunteers match.' : 'Everyone is already on this shift or busy at that time.'}</Text>
      ) : (
        <View style={{ borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
          {rows.map((r) => (
            <View key={r.id} style={[styles.rosterRow, { backgroundColor: colors.white, paddingHorizontal: spacing.md }]}>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={text.muted} numberOfLines={1}>
                  {r.detail}
                </Text>
                {r.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {r.tags.map((t) => (
                      <Tag key={t} label={t} />
                    ))}
                  </View>
                )}
              </View>
              {onShift.has(r.id) ? (
                <Text style={{ color: colors.green, fontWeight: '600' }}>✓ On shift</Text>
              ) : (
                <Button title="Add" variant="secondary" onPress={() => add(r.id)} loading={assign.isPending && assign.variables?.input.volunteerId === r.id} style={{ paddingVertical: 8 }} />
              )}
            </View>
          ))}
        </View>
      )}
      <Button title="Done" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}

function CancelEventSheet({ event, onClose }: { event: EventDetail; onClose: () => void }) {
  const cancel = useCancelEvent();
  const [reason, setReason] = useState('');
  const people = event.confirmedCount + event.waitlistCount;
  return (
    <Sheet visible title="Cancel event" onClose={onClose}>
      <Text style={text.body}>
        {people ? `${people} ${people === 1 ? 'person' : 'people'} with a place will be emailed.` : 'Nobody has signed up yet.'} The event stays in your list as cancelled.
      </Text>
      <Field label="Message to volunteers (optional)" value={reason} onChangeText={setReason} multiline placeholder="e.g. The hall is closed for repairs." />
      <FormError error={cancel.error} />
      <Button title="Cancel event" onPress={() => cancel.mutate({ id: event.id, input: { reason } }, { onSuccess: onClose })} loading={cancel.isPending} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  banner: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
  dayHeading: { color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1.5 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  name: { color: colors.ink, fontWeight: '600', fontSize: 15 },
});
