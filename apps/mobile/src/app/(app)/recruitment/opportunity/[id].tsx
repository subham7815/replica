import {
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_STATUS_LABELS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  colors,
  newQuestionId,
  opportunityInput,
  radii,
  spacing,
  type Opportunity,
  type OpportunityStatus,
  type Question,
  type SignupMode,
  type Visibility,
} from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useDeleteOpportunity, useDepartments, useLocations, useOpportunity, useSaveOpportunity } from '@newreplica/shared/queries';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Switch, Text, TextInput, View } from 'react-native';
import { ChipGroup, SavedNote } from '@/components/kit';
import { Screen } from '@/components/Screen';
import { Button, Card, Field, FormError, fieldErrors, text } from '@/components/ui';
import { shareOpportunity } from '@/features/share';

interface FormState {
  title: string;
  summary: string;
  description: string;
  commitment: string;
  locationId: string;
  departmentId: string;
  status: OpportunityStatus;
  signupMode: SignupMode;
  visibility: Visibility;
  questions: Question[];
}

const EMPTY: FormState = {
  title: '',
  summary: '',
  description: '',
  commitment: '',
  locationId: '',
  departmentId: '',
  status: 'DRAFT',
  signupMode: 'APPROVAL',
  visibility: 'PUBLIC',
  questions: [],
};

const fromOpportunity = (o: Opportunity): FormState => ({
  title: o.title,
  summary: o.summary,
  description: o.description ?? '',
  commitment: o.commitment ?? '',
  locationId: o.location?.id ?? '',
  departmentId: o.department?.id ?? '',
  status: o.status,
  signupMode: o.signupMode,
  visibility: o.visibility,
  questions: o.questions,
});

export default function OpportunityEditScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = rawId === 'new' ? undefined : rawId;
  const isNew = !id;
  const { can } = useAuth();
  const existing = useOpportunity(id);
  const locations = useLocations();
  const departments = useDepartments();
  const save = useSaveOpportunity();
  const remove = useDeleteOpportunity();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing.data) setForm(fromOpportunity(existing.data));
  }, [existing.data]);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  if (!can('volunteers:manage')) return <Redirect href="/home" />;
  if (!isNew && (existing.isPending || existing.isError)) {
    return <Screen edges={['bottom']}>{existing.isPending ? <ActivityIndicator color={colors.red} /> : <FormError error={existing.error} />}</Screen>;
  }

  const set = <K extends keyof FormState>(key: K) => (v: FormState[K]) => setForm((f) => ({ ...f, [key]: v }));
  const setQuestion = (i: number, patch: Partial<Question>) => set('questions')(form.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  function submit() {
    const payload = { ...form, locationId: form.locationId || null, departmentId: form.departmentId || null };
    const { data, errors } = fieldErrors(opportunityInput, payload);
    setErrors(errors);
    if (!data) return;
    save.mutate(
      { id, input: data },
      { onSuccess: (o) => (isNew ? router.replace({ pathname: '/recruitment/opportunity/[id]', params: { id: o.id } }) : setSaved(true)) },
    );
  }

  function confirmDelete() {
    const run = () => remove.mutate(id!, { onSuccess: () => router.back() });
    Alert.alert('Delete this opportunity?', 'Its applications are deleted too. Volunteers who joined stay in your list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: isNew ? 'New opportunity' : form.title || 'Opportunity' }} />

      <Card style={{ gap: spacing.lg }}>
        <Field label="Title" value={form.title} onChangeText={set('title')} placeholder="e.g. Saturday food sorting" error={errors?.title} />
        <Field label="One-line summary" value={form.summary} onChangeText={set('summary')} error={errors?.summary} />
        <Field label="Description" value={form.description} onChangeText={set('description')} multiline error={errors?.description} />
        <Field label="Commitment" value={form.commitment} onChangeText={set('commitment')} placeholder="e.g. Saturdays 9:00–12:00" error={errors?.commitment} />
        <ChipGroup
          label="Location"
          value={form.locationId}
          onChange={set('locationId')}
          options={[{ value: '', label: 'None' }, ...(locations.data ?? []).map((l) => ({ value: l.id, label: l.name }))]}
        />
        <ChipGroup
          label="Department"
          value={form.departmentId}
          onChange={set('departmentId')}
          options={[{ value: '', label: 'None' }, ...(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))]}
        />
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <ChipGroup
          label="How people join"
          value={form.signupMode}
          onChange={set('signupMode')}
          options={[
            { value: 'APPROVAL', label: 'Approval needed' },
            { value: 'OPEN', label: 'Join instantly' },
          ]}
        />
        <ChipGroup
          label="Who can find it"
          value={form.visibility}
          onChange={set('visibility')}
          options={[
            { value: 'PUBLIC', label: 'Listed publicly' },
            { value: 'UNLISTED', label: 'Link only' },
          ]}
        />
        <ChipGroup label="Status" value={form.status} onChange={set('status')} options={OPPORTUNITY_STATUSES.map((s) => ({ value: s, label: OPPORTUNITY_STATUS_LABELS[s] }))} />
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <View>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>Application questions</Text>
          <Text style={text.muted}>Name, email and phone are always asked.</Text>
        </View>
        {form.questions.map((q, i) => (
          <View key={q.id} style={{ gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md }}>
            <TextInput
              value={q.label}
              onChangeText={(label) => setQuestion(i, { label })}
              placeholder={`Question ${i + 1}`}
              placeholderTextColor={colors.faint}
              accessibilityLabel={`Question ${i + 1}`}
              style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, padding: 12, fontSize: 15, color: colors.ink }}
            />
            <ChipGroup
              value={q.type}
              onChange={(type) => setQuestion(i, { type, options: type === 'select' ? (q.options?.length ? q.options : []) : undefined })}
              options={QUESTION_TYPES.map((t) => ({ value: t, label: QUESTION_TYPE_LABELS[t] }))}
            />
            {q.type === 'select' && (
              <TextInput
                value={(q.options ?? []).join(', ')}
                onChangeText={(v) => setQuestion(i, { options: v.split(',').map((s) => s.trimStart()) })}
                onBlur={() => setQuestion(i, { options: (q.options ?? []).map((s) => s.trim()).filter(Boolean) })}
                placeholder="Options, separated by commas"
                placeholderTextColor={colors.faint}
                style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, padding: 12, fontSize: 15, color: colors.ink }}
              />
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Switch value={q.required} onValueChange={(required) => setQuestion(i, { required })} trackColor={{ true: colors.red, false: colors.lineStrong }} thumbColor={colors.white} />
                <Text style={text.body}>Required</Text>
              </View>
              <Text accessibilityRole="button" onPress={() => set('questions')(form.questions.filter((_, j) => j !== i))} style={{ color: colors.red, fontWeight: '600' }}>
                Remove
              </Text>
            </View>
          </View>
        ))}
        {errors?.questions && <Text style={{ color: colors.red }}>{errors.questions}</Text>}
        <Button
          title="+ Add question"
          variant="secondary"
          disabled={form.questions.length >= 15}
          onPress={() => set('questions')([...form.questions, { id: newQuestionId(), label: '', type: 'text', required: false }])}
        />
      </Card>

      <FormError error={save.error ?? remove.error} />
      <SavedNote visible={saved} />
      <Button title={isNew ? 'Create opportunity' : 'Save changes'} onPress={submit} loading={save.isPending} />
      {!isNew && existing.data?.status === 'PUBLISHED' && <Button title="Share link" variant="secondary" onPress={() => shareOpportunity(id!, form.title)} />}
      {!isNew && <Button title="Delete" variant="secondary" onPress={confirmDelete} loading={remove.isPending} />}
    </Screen>
  );
}
