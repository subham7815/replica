import { ROLE_LABELS, STAFF_ROLES, colors, inviteStaffInput, radii, spacing, type StaffRole, type TeamMember } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useInviteStaff, useRemoveStaff, useTeam, useUpdateStaff } from '@newreplica/shared/queries';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { ChipGroup, Sheet, StatusBadge } from '@/components/kit';
import { Screen } from '@/components/Screen';
import { Button, Card, Field, FormError, fieldErrors, text } from '@/components/ui';

const roleOptions = STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export default function TeamScreen() {
  const { can } = useAuth();
  const team = useTeam();
  const invite = useInviteStaff();
  const update = useUpdateStaff();
  const remove = useRemoveStaff();
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: StaffRole }>({ name: '', email: '', role: 'COORDINATOR' });
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [managing, setManaging] = useState<TeamMember | null>(null);

  if (!can('org:manage')) return <Redirect href="/home" />;

  function submitInvite() {
    const { data, errors } = fieldErrors(inviteStaffInput, form);
    setErrors(errors);
    if (data) invite.mutate(data, { onSuccess: () => setInviting(false) });
  }

  function confirmRemove(m: TeamMember) {
    Alert.alert(`Remove ${m.name}?`, 'They’ll lose access to your organisation straight away.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(m.id, { onSuccess: () => setManaging(null) }) },
    ]);
  }

  return (
    <Screen edges={['bottom']}>
      <Text style={text.body}>People who help run your organisation. Volunteers are managed on the Volunteers screen.</Text>
      <Button
        title="Invite team member"
        onPress={() => {
          invite.reset();
          setErrors(null);
          setForm({ name: '', email: '', role: 'COORDINATOR' });
          setInviting(true);
        }}
      />
      {team.isPending ? (
        <ActivityIndicator color={colors.red} />
      ) : team.isError ? (
        <FormError error={team.error} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {team.data.map((m) => (
            <Card key={m.id} style={{ padding: spacing.lg, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 15, flexShrink: 1 }}>
                  {m.name}
                  {m.isYou ? '  (you)' : ''}
                </Text>
                <StatusBadge status={m.status} />
              </View>
              <Text style={text.muted}>{m.email}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ backgroundColor: colors.navySoft, color: colors.navy, borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden', fontSize: 12 }}>
                  {ROLE_LABELS[m.role]}
                </Text>
                {!m.isYou && (
                  <Text
                    accessibilityRole="button"
                    onPress={() => {
                      update.reset();
                      setManaging(m);
                    }}
                    style={{ color: colors.red, fontWeight: '600' }}
                  >
                    Manage
                  </Text>
                )}
              </View>
            </Card>
          ))}
        </View>
      )}

      <Sheet visible={inviting} title="Invite team member" onClose={() => setInviting(false)}>
        <Field label="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} error={errors?.name} />
        <Field
          label="Email"
          value={form.email}
          onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors?.email}
        />
        <ChipGroup label="Role" options={roleOptions} value={form.role} onChange={(role) => setForm((f) => ({ ...f, role }))} />
        <Text style={text.muted}>They’ll get an email and sign in with a one-time code.</Text>
        <FormError error={invite.error} />
        <Button title="Send invite" onPress={submitInvite} loading={invite.isPending} />
      </Sheet>

      <Sheet visible={!!managing} title={managing?.name ?? ''} onClose={() => setManaging(null)}>
        {managing && (
          <>
            <ChipGroup
              label="Role"
              options={roleOptions}
              value={managing.role}
              onChange={(role) => update.mutate({ id: managing.id, input: { role } }, { onSuccess: () => setManaging({ ...managing, role }) })}
            />
            <FormError error={update.error ?? remove.error} />
            <Button
              title={managing.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
              variant="secondary"
              loading={update.isPending}
              onPress={() => {
                const status = managing.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
                update.mutate({ id: managing.id, input: { status } }, { onSuccess: () => setManaging({ ...managing, status }) });
              }}
            />
            <Button title="Remove from organisation" variant="secondary" onPress={() => confirmRemove(managing)} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
