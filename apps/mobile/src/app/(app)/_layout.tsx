import { colors } from '@newreplica/shared';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="home" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="module/[key]" options={{ title: '' }} />
      <Stack.Screen name="volunteers/index" options={{ title: 'Volunteers' }} />
      <Stack.Screen name="volunteers/new" options={{ title: 'Add volunteer' }} />
      <Stack.Screen name="volunteers/[id]" options={{ title: '' }} />
      <Stack.Screen name="volunteers/import" options={{ title: 'Import volunteers', presentation: 'modal' }} />
      <Stack.Screen name="recruitment/index" options={{ title: 'Recruitment' }} />
      <Stack.Screen name="recruitment/application/[id]" options={{ title: '' }} />
      <Stack.Screen name="recruitment/opportunities" options={{ title: 'Opportunities' }} />
      <Stack.Screen name="recruitment/opportunity/[id]" options={{ title: '' }} />
      <Stack.Screen name="settings/index" options={{ title: 'Organisation' }} />
      <Stack.Screen name="settings/profile" options={{ title: 'Profile & branding' }} />
      <Stack.Screen name="settings/locations" options={{ title: 'Locations' }} />
      <Stack.Screen name="settings/departments" options={{ title: 'Departments' }} />
      <Stack.Screen name="settings/team" options={{ title: 'Team' }} />
      <Stack.Screen name="settings/roles" options={{ title: 'Roles & permissions' }} />
    </Stack>
  );
}
