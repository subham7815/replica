import { applyInput, colors, radii, spacing, validateAnswers, type Answers } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useApply, usePublicOpportunity } from '@newreplica/shared/queries';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import { FadeUp } from '@/components/motion';
import { OrgMark, QuestionField, SignupModeBadge } from '@/components/recruitment';
import { Screen } from '@/components/Screen';
import { Button, Card, Field, FormError, fieldErrors, text } from '@/components/ui';

export default function OpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const opp = usePublicOpportunity(id);
  const apply = useApply();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setName((n) => n || user.name);
      setEmail((e) => e || user.email);
    }
  }, [user]);

  if (opp.isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <ActivityIndicator color={colors.red} />
      </Screen>
    );
  }
  if (opp.isError) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <FormError error={opp.error} />
        <Button title="Browse open roles" variant="secondary" onPress={() => router.replace('/discover')} />
      </Screen>
    );
  }

  const o = opp.data;
  const brand = o.organization.brandColor;

  function submit() {
    const { errors: base } = fieldErrors(applyInput, { name, email, phone, answers, consent });
    const all: Record<string, string> = { ...(base ?? {}), ...validateAnswers(o.questions, answers) };
    delete all.answers;
    setErrors(all);
    if (Object.keys(all).length) return;
    apply.mutate({ opportunityId: o.id, input: { name, email, phone, answers, consent: true } });
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: o.organization.name, headerShadowVisible: false, headerTintColor: colors.ink }} />

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/o/[slug]', params: { slug: o.organization.slug } })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <OrgMark org={o.organization} size={40} />
        <View>
          <Text style={{ color: colors.ink, fontWeight: '600' }}>{o.organization.name}</Text>
          <Text style={text.muted}>See all roles ›</Text>
        </View>
      </Pressable>

      <FadeUp>
        <View style={{ gap: spacing.sm }}>
          <SignupModeBadge mode={o.signupMode} />
          <Text style={[text.h1, { fontSize: 30, lineHeight: 36 }]}>{o.title}</Text>
          <Text style={[text.body, { fontSize: 17, lineHeight: 25 }]}>{o.summary}</Text>
        </View>
      </FadeUp>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {[o.commitment, o.location && `${o.location.name}${o.location.address ? `, ${o.location.address}` : ''}`, o.department]
          .filter(Boolean)
          .map((t) => (
            <View key={t as string} style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: colors.ink, fontSize: 13 }}>{t}</Text>
            </View>
          ))}
      </View>

      {o.description && <Text style={text.body}>{o.description}</Text>}

      <Card style={{ gap: spacing.lg, borderTopWidth: 4, borderTopColor: brand }}>
        {apply.isSuccess ? (
          <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: brand, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.white, fontSize: 26, fontWeight: '700' }}>✓</Text>
            </View>
            <Text style={[text.h1, { fontSize: 22 }]}>{o.signupMode === 'OPEN' ? 'You’re signed up!' : 'Application sent'}</Text>
            <Text style={[text.body, { textAlign: 'center' }]}>
              We’ve emailed {email}{' '}
              {o.signupMode === 'OPEN' ? 'with how to sign in and see your shifts.' : `to confirm. ${o.organization.name} will review it and let you know.`}
            </Text>
            <Button title="Find more roles" variant="secondary" onPress={() => router.replace('/discover')} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <>
            <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18 }}>{o.signupMode === 'OPEN' ? 'Sign up' : 'Apply'}</Text>
            <Field label="Your name" value={name} onChangeText={setName} autoComplete="name" error={errors.name} />
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email} />
            <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
            {o.questions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(v) =>
                  setAnswers((a) => {
                    const next = { ...a };
                    if (v === undefined) delete next[q.id];
                    else next[q.id] = v;
                    return next;
                  })
                }
                error={errors[q.id]}
              />
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Switch value={consent} onValueChange={setConsent} trackColor={{ true: brand, false: colors.lineStrong }} thumbColor={colors.white} />
              <Text style={[text.body, { flex: 1, fontSize: 14 }]}>{o.organization.name} can store these details and contact me about volunteering.</Text>
            </View>
            {errors.consent && <Text style={{ color: colors.red, fontSize: 13 }}>{errors.consent}</Text>}
            <FormError error={apply.error} />
            <Button title={o.signupMode === 'OPEN' ? 'Sign up' : 'Send application'} onPress={submit} loading={apply.isPending} />
            <Text style={[text.muted, { textAlign: 'center', fontSize: 12 }]}>No account or password needed.</Text>
          </>
        )}
      </Card>
    </Screen>
  );
}
