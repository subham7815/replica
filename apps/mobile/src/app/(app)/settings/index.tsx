import { colors, radii, spacing } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useOrganization } from '@newreplica/shared/queries';
import { Redirect, router, type Href } from 'expo-router';
import { Text, View } from 'react-native';
import { ListRow } from '@/components/kit';
import { Screen } from '@/components/Screen';
import { text } from '@/components/ui';

const SECTIONS: { href: Href; title: string; subtitle: string }[] = [
  { href: '/settings/profile', title: 'Profile & branding', subtitle: 'Name, contact details, time zone, colour and logo' },
  { href: '/settings/locations', title: 'Locations', subtitle: 'Places where shifts happen' },
  { href: '/settings/departments', title: 'Departments', subtitle: 'Group volunteers by team' },
  { href: '/settings/team', title: 'Team', subtitle: 'Admins, coordinators, check-in staff and auditors' },
  { href: '/settings/roles', title: 'Roles & permissions', subtitle: 'What each role can do' },
];

export default function SettingsScreen() {
  const { can } = useAuth();
  const org = useOrganization();
  if (!can('org:manage')) return <Redirect href="/home" />;

  return (
    <Screen edges={['bottom']}>
      <Text style={text.eyebrow}>{(org.data?.name ?? '').toUpperCase()}</Text>
      <View style={{ borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
        {SECTIONS.map((s, i) => (
          <View key={s.title} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.lineSoft } : undefined}>
            <ListRow title={s.title} subtitle={s.subtitle} onPress={() => router.push(s.href)} right={<Text style={{ color: colors.faint, fontSize: 18 }}>›</Text>} />
          </View>
        ))}
      </View>
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}
