import { colors, radii, spacing } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useApplication, useReviewApplication } from '@newreplica/shared/queries';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { ApplicationStatusBadge } from '@/components/recruitment';
import { Screen } from '@/components/Screen';
import { Button, Card, Field, FormError, text } from '@/components/ui';

export default function ApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const detail = useApplication(id);
  const review = useReviewApplication();
  const [note, setNote] = useState('');

  if (!can('volunteers:manage')) return <Redirect href="/home" />;
  if (detail.isPending || detail.isError) {
    return (
      <Screen edges={['bottom']}>
        {detail.isPending ? <ActivityIndicator color={colors.red} /> : <FormError error={detail.error} />}
      </Screen>
    );
  }

  const a = detail.data;
  const decide = (decision: 'approve' | 'reject') => review.mutate({ id: a.id, decision, input: { note } }, { onSuccess: () => setNote('') });

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: a.name }} />
      <View style={{ gap: spacing.sm }}>
        <ApplicationStatusBadge status={a.status} />
        <Text style={text.muted}>
          For {a.opportunity.title} · {new Date(a.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <Card style={{ gap: spacing.md }}>
        <View>
          <Text style={text.muted}>Email</Text>
          <Text accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${a.email}`)} style={{ color: colors.red, fontWeight: '600' }}>
            {a.email}
          </Text>
        </View>
        <View>
          <Text style={text.muted}>Phone</Text>
          {a.phone ? (
            <Text accessibilityRole="link" onPress={() => void Linking.openURL(`tel:${a.phone}`)} style={{ color: colors.red, fontWeight: '600' }}>
              {a.phone}
            </Text>
          ) : (
            <Text style={{ color: colors.ink }}>—</Text>
          )}
        </View>
      </Card>

      {a.answers.length > 0 && (
        <Card style={{ gap: spacing.md }}>
          {a.answers.map((ans) => (
            <View key={ans.question}>
              <Text style={[text.muted, { fontSize: 12, fontWeight: '600' }]}>{ans.question}</Text>
              <Text style={{ color: colors.ink, fontSize: 15, marginTop: 2 }}>{ans.answer}</Text>
            </View>
          ))}
        </Card>
      )}

      {a.status !== 'PENDING' && (a.reviewedBy || a.reviewNote) && (
        <View style={{ backgroundColor: colors.navySoft, borderRadius: radii.md, padding: spacing.md }}>
          <Text style={text.body}>
            {a.reviewedBy ? `${a.status === 'APPROVED' ? 'Approved' : 'Declined'} by ${a.reviewedBy}.` : 'Joined automatically.'}
            {a.reviewNote ? ` “${a.reviewNote}”` : ''}
          </Text>
        </View>
      )}

      {a.status === 'APPROVED' && a.volunteerId && (
        <Button title="Open volunteer record" variant="secondary" onPress={() => router.push({ pathname: '/volunteers/[id]', params: { id: a.volunteerId! } })} />
      )}

      {a.status !== 'APPROVED' && (
        <>
          <Field label="Message to applicant (optional)" value={note} onChangeText={setNote} multiline hint="Included in the email we send them." />
          <FormError error={review.error} />
          <Button title="Approve" onPress={() => decide('approve')} loading={review.isPending} />
          {a.status === 'PENDING' && <Button title="Decline" variant="secondary" onPress={() => decide('reject')} disabled={review.isPending} />}
        </>
      )}
    </Screen>
  );
}
