import { colors } from '@newreplica/shared';
import { AuthProvider, useAuth } from '@newreplica/shared/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { API_URL, storage } from '@/config';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider baseUrl={API_URL} storage={storage}>
        <StatusBar style="dark" />
        <RootStack />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootStack() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.red} />
      </View>
    );
  }

  const signedIn = state.status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      {/* "/" stays reachable in both states: it redirects signed-in users to /home, so the stack always has a fallback route. */}
      <Stack.Screen name="index" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn} redirectTo="/login">
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="verify" />
      <Stack.Screen name="discover/index" />
      <Stack.Screen name="opportunity/[id]" />
      <Stack.Screen name="o/[slug]" />
    </Stack>
  );
}
