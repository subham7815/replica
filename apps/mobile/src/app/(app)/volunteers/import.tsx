import { colors, radii, spacing, type ImportResult } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useImportVolunteers } from '@newreplica/shared/queries';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Redirect, Stack, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ToggleRow } from '@/components/kit';
import { Screen } from '@/components/Screen';
import { Button, Card, FormError, text } from '@/components/ui';

const OUTCOME = {
  create: { label: 'New', fg: colors.green, bg: colors.greenSoft },
  skip: { label: 'Skipped', fg: colors.muted, bg: colors.navySoft },
  error: { label: 'Error', fg: colors.red, bg: colors.redSoft },
} as const;

export default function ImportScreen() {
  const { can } = useAuth();
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [sendInvites, setSendInvites] = useState(false);
  const [readError, setReadError] = useState<unknown>(null);
  const preview = useImportVolunteers();
  const commit = useImportVolunteers();

  if (!can('volunteers:manage')) return <Redirect href="/home" />;

  async function pick() {
    setReadError(null);
    preview.reset();
    commit.reset();
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const asset = res.assets[0]!;
    try {
      const content = await new File(asset.uri).text();
      setCsv(content);
      setFileName(asset.name);
      preview.mutate({ csv: content, dryRun: true });
    } catch (err) {
      setReadError(err);
    }
  }

  const result: ImportResult | undefined = commit.data ?? preview.data;
  const count = (o: keyof typeof OUTCOME) => result?.rows.filter((r) => r.outcome === o).length ?? 0;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Import volunteers' }} />

      {commit.data ? (
        <Card style={{ alignItems: 'center', gap: spacing.md }}>
          <Text style={{ fontSize: 40 }}>✓</Text>
          <Text style={[text.h1, { fontSize: 22, textAlign: 'center' }]}>
            {commit.data.created} {commit.data.created === 1 ? 'volunteer' : 'volunteers'} imported
          </Text>
          {count('error') > 0 && <Text style={[text.muted, { textAlign: 'center' }]}>{count('error')} rows couldn’t be imported.</Text>}
          <Button title="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
        </Card>
      ) : (
        <>
          <Text style={text.body}>
            Choose a CSV with a header row. name and email are required; phone, departments, skills and notes are optional. Separate several
            departments or skills with a semicolon.
          </Text>
          <Button title={fileName ? `Choose another file (${fileName})` : 'Choose CSV file'} variant="secondary" onPress={pick} />
          <FormError error={readError ?? preview.error ?? commit.error} />
          {preview.isPending && <ActivityIndicator color={colors.red} />}

          {result && (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['create', 'skip', 'error'] as const).map((o) => (
                  <View key={o} style={[styles.pill, { backgroundColor: OUTCOME[o].bg }]}>
                    <Text style={{ color: OUTCOME[o].fg, fontWeight: '600' }}>
                      {count(o)} {o === 'create' ? 'new' : o === 'skip' ? 'already added' : 'with errors'}
                    </Text>
                  </View>
                ))}
              </View>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {result.rows.map((r, i) => (
                  <View key={r.row} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.lineSoft }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.ink, fontWeight: '600' }}>
                        {r.row}. {r.name || '—'}
                      </Text>
                      <Text style={text.muted}>{r.email || '—'}</Text>
                      {r.message && <Text style={[text.muted, { fontSize: 12 }]}>{r.message}</Text>}
                    </View>
                    <View style={[styles.pill, { backgroundColor: OUTCOME[r.outcome].bg }]}>
                      <Text style={{ color: OUTCOME[r.outcome].fg, fontSize: 12, fontWeight: '600' }}>{OUTCOME[r.outcome].label}</Text>
                    </View>
                  </View>
                ))}
              </Card>
              <ToggleRow label="Email each new volunteer an invitation" value={sendInvites} onChange={setSendInvites} />
              <Button
                title={`Import ${count('create')} ${count('create') === 1 ? 'volunteer' : 'volunteers'}`}
                disabled={count('create') === 0}
                loading={commit.isPending}
                onPress={() => csv && commit.mutate({ csv, dryRun: false, sendInvites })}
              />
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.lg },
});
