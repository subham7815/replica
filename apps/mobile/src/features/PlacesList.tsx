import { colors, radii, spacing } from '@newreplica/shared';
import type { UseMutationResult } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import type { z } from 'zod';
import { EmptyState, ListRow, Sheet } from '@/components/kit';
import { Screen } from '@/components/Screen';
import { Button, Field, FormError, fieldErrors, text } from '@/components/ui';

interface FieldDef {
  key: string;
  label: string;
  multiline?: boolean;
  hint?: string;
}

interface Item {
  id: string;
  name: string;
}

// Shared list + add/edit sheet used by the Locations and Departments screens.
export function PlacesList<T extends Item, I>({
  intro,
  noun,
  emptyBody,
  query,
  fields,
  schema,
  toValues,
  subtitle,
  badge,
  save,
  remove,
  deleteWarning,
}: {
  intro: string;
  noun: string;
  emptyBody: string;
  query: { data?: T[]; isPending: boolean; isError: boolean; error: unknown };
  fields: FieldDef[];
  schema: z.ZodType<I>;
  toValues: (item: T | null) => Record<string, string>;
  subtitle: (item: T) => string | null;
  badge?: (item: T) => ReactNode;
  save: UseMutationResult<unknown, Error, { id?: string; input: I }>;
  remove: UseMutationResult<unknown, Error, string>;
  deleteWarning?: (item: T) => string | undefined;
}) {
  const [editing, setEditing] = useState<{ item: T | null } | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  function open(item: T | null) {
    save.reset();
    setErrors(null);
    setValues(toValues(item));
    setEditing({ item });
  }

  function submit() {
    const { data, errors } = fieldErrors(schema, values);
    setErrors(errors);
    if (data) save.mutate({ id: editing?.item?.id, input: data }, { onSuccess: () => setEditing(null) });
  }

  function confirmDelete(item: T) {
    const warning = deleteWarning?.(item);
    Alert.alert(`Delete ${item.name}?`, `This can’t be undone.${warning ? ` ${warning}` : ''}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(item.id) },
    ]);
  }

  return (
    <Screen edges={['bottom']}>
      <Text style={text.body}>{intro}</Text>
      <Button title={`Add ${noun}`} onPress={() => open(null)} />
      <FormError error={remove.error} />
      {query.isPending ? (
        <ActivityIndicator color={colors.red} />
      ) : query.isError ? (
        <FormError error={query.error} />
      ) : !query.data?.length ? (
        <EmptyState title={`No ${noun}s yet`} body={emptyBody} />
      ) : (
        <View style={{ borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
          {query.data.map((item, i) => (
            <View key={item.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.lineSoft } : undefined}>
              <ListRow
                title={item.name}
                subtitle={subtitle(item)}
                onPress={() => open(item)}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    {badge?.(item)}
                    <Text accessibilityRole="button" accessibilityLabel={`Delete ${item.name}`} onPress={() => confirmDelete(item)} style={{ color: colors.red, fontWeight: '600' }}>
                      Delete
                    </Text>
                  </View>
                }
              />
            </View>
          ))}
        </View>
      )}

      <Sheet visible={!!editing} title={editing?.item ? `Edit ${noun}` : `Add ${noun}`} onClose={() => setEditing(null)}>
        {fields.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            value={values[f.key] ?? ''}
            onChangeText={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
            multiline={f.multiline}
            hint={f.hint}
            error={errors?.[f.key]}
          />
        ))}
        <FormError error={save.error} />
        <Button title="Save" onPress={submit} loading={save.isPending} />
      </Sheet>
    </Screen>
  );
}
