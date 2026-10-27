import { colors, loginInput, radii, requestCodeInput, verifyCodeInput, type RequestCodeResponse } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Logo } from '@/components/Logo';
import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Field, FormError, fieldErrors, text } from '@/components/ui';

type Mode = 'password' | 'code';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('password');
  return (
    <Screen>
      <Logo />
      <FadeUp>
        <View style={{ gap: 6, marginTop: 24 }}>
          <Text style={text.h1}>Sign in</Text>
          <Text style={text.muted}>
            New organisation?{' '}
            <Link href="/register" style={text.link}>
              Create an account
            </Link>
          </Text>
        </View>
      </FadeUp>

      <View style={styles.tabs} accessibilityRole="tablist">
        {(
          [
            ['password', 'Password'],
            ['code', 'Email me a code'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === key }}
            onPress={() => setMode(key)}
            style={[styles.tab, mode === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === key && { color: colors.ink }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'password' ? <PasswordForm /> : <CodeForm />}
    </Screen>
  );
}

function PasswordForm() {
  const { api, completeSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const login = useMutation({ mutationFn: api.login, onSuccess: completeSignIn });

  function submit() {
    const { data, errors } = fieldErrors(loginInput, { email, password });
    setErrors(errors);
    if (data) login.mutate(data);
  }

  return (
    <View style={{ gap: 16 }}>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={errors?.email}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
        error={errors?.password}
      />
      <FormError error={login.error} />
      <Button title="Sign in" onPress={submit} loading={login.isPending} />
    </View>
  );
}

function CodeForm() {
  const { api, completeSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<RequestCodeResponse | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  const request = useMutation({ mutationFn: api.requestCode, onSuccess: setSent });
  const verify = useMutation({ mutationFn: api.verifyCode, onSuccess: completeSignIn });

  function sendCode() {
    const { data, errors } = fieldErrors(requestCodeInput, { email });
    setErrors(errors);
    if (data) request.mutate(data);
  }

  function submitCode() {
    const { data, errors } = fieldErrors(verifyCodeInput, { email, code });
    setErrors(errors && { code: 'Enter the 6-digit code' });
    if (data) verify.mutate(data);
  }

  if (!sent) {
    return (
      <View style={{ gap: 16 }}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          onSubmitEditing={sendCode}
          error={errors?.email}
          hint="We'll email you a 6-digit code. No password needed."
        />
        <FormError error={request.error} />
        <Button title="Send code" onPress={sendCode} loading={request.isPending} />
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <Text style={text.body}>
        If <Text style={{ color: colors.ink, fontWeight: '600' }}>{email}</Text> has an account, a code is on its way. It
        expires in 15 minutes.
      </Text>
      {sent.dev && (
        <View style={styles.devHint}>
          <Text style={{ color: colors.amber }}>
            <Text style={{ fontWeight: '700' }}>Dev mode:</Text> your code is{' '}
            <Text style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{sent.dev.code}</Text>
          </Text>
        </View>
      )}
      <Field
        label="6-digit code"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        onSubmitEditing={submitCode}
        error={errors?.code}
      />
      <FormError error={verify.error} />
      <Button title="Verify and sign in" onPress={submitCode} loading={verify.isPending} />
      <Button
        title="Use a different email"
        variant="secondary"
        onPress={() => {
          setSent(null);
          setCode('');
          verify.reset();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colors.navySoft, borderRadius: radii.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: colors.white, boxShadow: '0 1px 2px #1112180f' },
  tabText: { color: colors.muted, fontWeight: '500', fontSize: 14 },
  devHint: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9a4a0066',
    backgroundColor: colors.amberSoft,
    borderRadius: radii.md,
    padding: 12,
  },
});
