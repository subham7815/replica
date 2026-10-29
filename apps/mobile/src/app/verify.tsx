import { colors } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, FormError, text } from '@/components/ui';

// Handles dexserve://verify?token=… sign-in links.
export default function VerifyScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { api, completeSignIn } = useAuth();
  const started = useRef(false);
  const verify = useMutation({
    mutationFn: api.verifyCode,
    onSuccess: async (res) => {
      await completeSignIn(res);
      router.replace('/home');
    },
  });

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verify.mutate({ token });
  }, [token, verify]);

  return (
    <Screen>
      <Text style={text.h1}>Signing you in</Text>
      {!token ? (
        <FormError error={new Error('incomplete link')} />
      ) : verify.isError ? (
        <View style={{ gap: 16 }}>
          <FormError error={verify.error} />
          <Button title="Request a new code" onPress={() => router.replace('/login')} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <ActivityIndicator color={colors.red} />
          <Text style={text.body}>Verifying…</Text>
        </View>
      )}
    </Screen>
  );
}
