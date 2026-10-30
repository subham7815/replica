import { LATE_CANCEL_HOURS, colors, formatDay, formatTimeRange, isLateCancel, radii, spacing, type OpenEvent, type OpenShift } from '@newreplica/shared';
import { useCancelMyShift, useMyShifts, useOpenShifts, useSignUpForShift } from '@newreplica/shared/queries';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Sheet } from '@/components/kit';
import { PlacePill } from '@/components/schedule';
import { Button, Card, Field, FormError, text } from '@/components/ui';

type Target = { shiftId: string; title: string; when: string; status: 'CONFIRMED' | 'WAITLISTED'; startsAt: string };

export default function MyShiftsScreen() {
  const mine = useMyShifts();
  const open = useOpenShifts();
  const [cancelling, setCancelling] = useState<Target | null>(null);
  const refreshing = (mine.isRefetching || open.isRefetching) && !mine.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void Promise.all([mine.refetch(), open.refetch()])} tintColor={colors.red} />}
      >
        <Text style={styles.heading}>Coming up</Text>
        {mine.isPending ? (
          <ActivityIndicator color={colors.red} />
        ) : mine.isError ? (
          <FormError error={mine.error} />
        ) : mine.data.length === 0 ? (
          <EmptyState title="No shifts booked" body="Pick one below and you’ll get a confirmation email." />
        ) : (
          mine.data.map((m) => {
            const when = `${formatDay(m.shift.startsAt, m.timezone)}, ${formatTimeRange(m.shift.startsAt, m.shift.endsAt, m.timezone)}`;
            const started = new Date(m.shift.startsAt) <= new Date();
            return (
              <Card key={m.assignmentId} style={{ padding: spacing.lg, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                  <Text style={styles.title}>
                    {m.event.title} · {m.shift.title}
                  </Text>
                  <PlacePill status={m.status} position={m.waitlistPosition} />
                </View>
                <Text style={text.body}>{when}</Text>
                {m.event.location && <Text style={text.muted}>{m.event.location.name}</Text>}
                {!started && (
                  <Button
                    title={m.status === 'CONFIRMED' ? 'I can’t make it' : 'Leave waitlist'}
                    variant="secondary"
                    style={{ marginTop: spacing.sm }}
                    onPress={() => setCancelling({ shiftId: m.shift.id, title: `${m.event.title} · ${m.shift.title}`, when, status: m.status, startsAt: m.shift.startsAt })}
                  />
                )}
              </Card>
            );
          })
        )}

        <Text style={[styles.heading, { marginTop: spacing.lg }]}>Sign up for a shift</Text>
        {open.isPending ? (
          <ActivityIndicator color={colors.red} />
        ) : open.isError ? (
          <FormError error={open.error} />
        ) : open.data.length === 0 ? (
          <EmptyState title="No open shifts right now" body="New shifts appear here when your organisation publishes them." />
        ) : (
          open.data.map((e) => <OpenEventCard key={e.id} event={e} onCancel={setCancelling} />)
        )}
      </ScrollView>
      {cancelling && <CancelSheet target={cancelling} onClose={() => setCancelling(null)} />}
    </SafeAreaView>
  );
}

function OpenEventCard({ event, onCancel }: { event: OpenEvent; onCancel: (t: Target) => void }) {
  return (
    <Card style={{ padding: spacing.lg, gap: 4 }}>
      <Text style={[styles.title, { fontSize: 17 }]}>{event.title}</Text>
      {(event.location || event.department) && <Text style={text.muted}>{[event.location?.name, event.department?.name].filter(Boolean).join(' · ')}</Text>}
      {event.description ? (
        <Text style={[text.body, { fontSize: 14 }]} numberOfLines={3}>
          {event.description}
        </Text>
      ) : null}
      <View style={{ marginTop: spacing.sm }}>
        {event.shifts.map((s) => (
          <OpenShiftRow key={s.id} shift={s} event={event} onCancel={onCancel} />
        ))}
      </View>
    </Card>
  );
}

function OpenShiftRow({ shift, event, onCancel }: { shift: OpenShift; event: OpenEvent; onCancel: (t: Target) => void }) {
  const signUp = useSignUpForShift();
  const when = `${formatDay(shift.startsAt, event.timezone)}, ${formatTimeRange(shift.startsAt, shift.endsAt, event.timezone)}`;
  const full = shift.spotsLeft === 0;
  return (
    <View style={styles.shiftRow}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 15 }}>{shift.title}</Text>
          <Text style={text.muted}>{when}</Text>
        </View>
        {shift.myStatus ? (
          <PlacePill status={shift.myStatus} position={shift.myWaitlistPosition} />
        ) : (
          <Text style={{ color: full ? colors.amber : colors.green, fontWeight: '600', fontSize: 13 }}>
            {full ? (shift.waitlistEnabled ? `Full · ${shift.waitlistCount} waiting` : 'Full') : `${shift.spotsLeft} left`}
          </Text>
        )}
      </View>
      {shift.notes ? <Text style={text.muted}>{shift.notes}</Text> : null}
      <FormError error={signUp.error} />
      {shift.myStatus ? (
        <Text
          accessibilityRole="button"
          style={{ color: colors.muted, fontWeight: '600' }}
          onPress={() => onCancel({ shiftId: shift.id, title: `${event.title} · ${shift.title}`, when, status: shift.myStatus!, startsAt: shift.startsAt })}
        >
          {shift.myStatus === 'CONFIRMED' ? 'Cancel my place' : 'Leave waitlist'}
        </Text>
      ) : (
        (!full || shift.waitlistEnabled) && (
          <Button title={full ? 'Join waitlist' : 'Sign up'} variant={full ? 'secondary' : 'primary'} loading={signUp.isPending} onPress={() => signUp.mutate(shift.id)} style={{ paddingVertical: 10 }} />
        )
      )}
    </View>
  );
}

function CancelSheet({ target, onClose }: { target: Target; onClose: () => void }) {
  const cancel = useCancelMyShift();
  const [reason, setReason] = useState('');
  const late = target.status === 'CONFIRMED' && isLateCancel(target.startsAt);
  return (
    <Sheet visible title={target.status === 'CONFIRMED' ? 'Cancel this shift?' : 'Leave the waitlist?'} onClose={onClose}>
      <View style={{ gap: 2 }}>
        <Text style={styles.title}>{target.title}</Text>
        <Text style={text.body}>{target.when}</Text>
      </View>
      {late && (
        <View style={styles.warning}>
          <Text style={{ color: colors.amber }}>
            This shift starts in less than {LATE_CANCEL_HOURS} hours, so it’s recorded as a late cancellation. If nobody on the waitlist can take your place, the organisers are emailed.
          </Text>
        </View>
      )}
      {target.status === 'CONFIRMED' && <Field label="Reason (optional)" value={reason} onChangeText={setReason} multiline hint="Only the organisers see this." />}
      <FormError error={cancel.error} />
      <Button
        title={target.status === 'CONFIRMED' ? 'Cancel shift' : 'Leave waitlist'}
        loading={cancel.isPending}
        onPress={() => cancel.mutate({ shiftId: target.shiftId, input: { reason } }, { onSuccess: onClose })}
      />
      <Button title="Keep my place" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  heading: { color: colors.ink, fontWeight: '700', fontSize: 20 },
  title: { color: colors.ink, fontWeight: '700', fontSize: 16, flexShrink: 1 },
  shiftRow: { gap: 8, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  warning: { backgroundColor: colors.amberSoft, borderColor: '#9a4a0040', borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
});
