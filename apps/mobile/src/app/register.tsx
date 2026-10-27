import { registerOrganizationInput } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Logo } from '@/components/Logo';
import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Field, FormError, fieldErrors, text } from '@/components/ui';

export default function RegisterScreen() {
  const { api, completeSignIn } = useAuth();
  const [form, setForm] = useState({ organizationName: '', name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const register = useMutation({ mutationFn: api.registerOrganization, onSuccess: completeSignIn });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    const { data, errors } = fieldErrors(registerOrganizationInput, form);
    setErrors(errors);
    if (data) register.mutate(data);
  }

  return (
    <Screen>
      <Logo />
      <FadeUp>
        <View style={{ gap: 6, marginTop: 24 }}>
          <Text style={text.h1}>Create your organisation</Text>
          <Text style={text.muted}>
            Already have an account?{' '}
            <Link href="/login" style={text.link}>
              Sign in
            </Link>
          </Text>
        </View>
      </FadeUp>
      <View style={{ gap: 16 }}>
        <Field label="Organisation name" value={form.organizationName} onChangeText={set('organizationName')} error={errors?.organizationName} />
        <Field label="Your name" value={form.name} onChangeText={set('name')} autoComplete="name" error={errors?.name} />
        <Field
          label="Work email"
          value={form.email}
          onChangeText={set('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={errors?.email}
        />
        <Field
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          hint="At least 8 characters."
          error={errors?.password}
        />
        <FormError error={register.error} />
        <Button title="Create organisation" onPress={submit} loading={register.isPending} />
        <Text style={[text.muted, { textAlign: 'center', fontSize: 12 }]}>
          You'll be the organisation admin and can invite your team next.
        </Text>
      </View>
    </Screen>
  );
}
