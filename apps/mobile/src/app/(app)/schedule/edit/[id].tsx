import { colors, eventInput, spacing } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useDepartments, useEvent, useLocations, useSaveEvent } from '@newreplica/shared/queries';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ChipGroup } from '@/components/kit';
import { Screen } from '@/components/Screen';
import { Button, Card, Field, FormError, fieldErrors } from '@/components/ui';

export default function EventEditScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = rawId === 'new' ? undefined : rawId;
  const { can } = useAuth();
  const existing = useEvent(id);
  const locations = useLocations();
  const departments = useDepartments();
  const save = useSaveEvent();
  const [form, setForm] = useState({ title: '', description: '', locationId: '', departmentId: '' });
  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const e = existing.data;
    if (e) setForm({ title: e.title, description: e.description ?? '', locationId: e.location?.id ?? '', departmentId: e.department?.id ?? '' });
  }, [existing.data]);

  if (!can('programmes:manage')) return <Redirect href="/home" />;
  if (id && (existing.isPending || existing.isError)) {
    return <Screen edges={['bottom']}>{existing.isPending ? <ActivityIndicator color={colors.red} /> : <FormError error={existing.error} />}</Screen>;
  }

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  function submit() {
    const { data, errors } = fieldErrors(eventInput, { ...form, locationId: form.locationId || null, departmentId: form.departmentId || null });
    setErrors(errors);
    if (!data) return;
    save.mutate(
      { id, input: data },
      { onSuccess: (e) => (id ? router.back() : router.replace({ pathname: '/schedule/[id]', params: { id: e.id } })) },
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: id ? 'Edit event' : 'New event' }} />
      <Card style={{ gap: spacing.lg }}>
        <Field label="Title" value={form.title} onChangeText={set('title')} placeholder="e.g. Saturday food sorting" error={errors?.title} />
        <Field
          label="Description"
          value={form.description}
          onChangeText={set('description')}
          multiline
          hint="Volunteers see this when they sign up."
          error={errors?.description}
        />
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
      <FormError error={save.error} />
      <Button title={id ? 'Save changes' : 'Create and add shifts'} onPress={submit} loading={save.isPending} />
    </Screen>
  );
}
