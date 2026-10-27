import {
  MEMBER_STATUSES,
  MEMBER_STATUS_LABELS,
  colors,
  spacing,
  updateVolunteerInput,
  volunteerInput,
  type Availability,
  type MemberStatus,
  type Volunteer,
} from '@newreplica/shared';
import { useCreateVolunteer, useDeleteVolunteer, useDepartments, useUpdateVolunteer, useVolunteer } from '@newreplica/shared/queries';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { ChipGroup, SavedNote, StatusBadge, ToggleRow } from '@/components/kit';
import { Screen } from '@/components/Screen';
import { Button, Card, Field, FormError, fieldErrors, text } from '@/components/ui';
import { AvailabilityGrid, DepartmentPicker, SkillsInput } from '@/components/volunteers';

interface FormState {
  name: string;
  email: string;
  phone: string;
  status: MemberStatus;
  skills: string[];
  notes: string;
  availability: Availability;
  departmentIds: string[];
  sendInvite: boolean;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  status: 'INVITED',
  skills: [],
  notes: '',
  availability: {},
  departmentIds: [],
  sendInvite: true,
};

function fromVolunteer(v: Volunteer): FormState {
  return {
    name: v.name,
    email: v.email,
    phone: v.phone ?? '',
    status: v.status,
    skills: v.skills,
    notes: v.notes ?? '',
    availability: v.availability,
    departmentIds: v.departments.map((d) => d.id),
    sendInvite: false,
  };
}

export function VolunteerForm({ id }: { id?: string }) {
  const isNew = !id;
  const volunteer = useVolunteer(id);
  const departments = useDepartments();
  const create = useCreateVolunteer();
  const update = useUpdateVolunteer();
  const remove = useDeleteVolunteer();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (volunteer.data) setForm(fromVolunteer(volunteer.data));
  }, [volunteer.data]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const locked = !isNew && volunteer.data && !volunteer.data.identityEditable;
  const mutation = isNew ? create : update;

  function submit() {
    if (isNew) {
      const { data, errors } = fieldErrors(volunteerInput, form);
      setErrors(errors);
      if (data) create.mutate(data, { onSuccess: (v) => router.replace({ pathname: '/volunteers/[id]', params: { id: v.id } }) });
    } else {
      const { sendInvite: _ignored, ...rest } = form;
      const { data, errors } = fieldErrors(updateVolunteerInput, rest);
      setErrors(errors);
      if (data) update.mutate({ id: id!, input: data }, { onSuccess: () => setSaved(true) });
    }
  }

  function confirmRemove() {
    Alert.alert('Remove volunteer?', `${volunteer.data?.name} will be removed from your organisation.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(id!, { onSuccess: () => router.back() }) },
    ]);
  }

  if (!isNew && volunteer.isPending) {
    return (
      <Screen edges={['bottom']}>
        <ActivityIndicator color={colors.red} />
      </Screen>
    );
  }
  if (!isNew && volunteer.isError) {
    return (
      <Screen edges={['bottom']}>
        <FormError error={volunteer.error} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: isNew ? 'Add volunteer' : volunteer.data!.name }} />
      {!isNew && (
        <View style={{ gap: 6 }}>
          <StatusBadge status={volunteer.data!.status} />
        </View>
      )}

      <Card style={{ gap: spacing.lg }}>
        <Field label="Full name" value={form.name} onChangeText={set('name')} editable={!locked} error={errors?.name} />
        <Field
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          editable={!locked}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors?.email}
        />
        {locked && <Text style={text.muted}>{volunteer.data!.name} manages their own name and email now that they have a Replica account.</Text>}
        <Field label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors?.phone} />
        <ChipGroup
          label="Status"
          value={form.status}
          onChange={set('status')}
          options={MEMBER_STATUSES.map((s) => ({ value: s, label: MEMBER_STATUS_LABELS[s] }))}
        />
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <DepartmentPicker departments={departments.data ?? []} value={form.departmentIds} onChange={set('departmentIds')} />
        <SkillsInput value={form.skills} onChange={set('skills')} />
        <AvailabilityGrid value={form.availability} onChange={set('availability')} />
        <Field label="Notes" value={form.notes} onChangeText={set('notes')} multiline hint="Only your team can see these." error={errors?.notes} />
      </Card>

      {isNew && <ToggleRow label="Email an invitation to sign in" value={form.sendInvite} onChange={set('sendInvite')} />}

      <FormError error={mutation.error ?? remove.error} />
      <SavedNote visible={saved} />
      <Button title={isNew ? 'Add volunteer' : 'Save changes'} onPress={submit} loading={mutation.isPending} />
      {!isNew && <Button title="Remove from organisation" variant="secondary" onPress={confirmRemove} loading={remove.isPending} />}
    </Screen>
  );
}
