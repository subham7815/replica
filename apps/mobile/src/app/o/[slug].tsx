import { colors, spacing } from '@newreplica/shared';
import { usePublicOrganization } from '@newreplica/shared/queries';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { EmptyState } from '@/components/kit';
import { FadeUp } from '@/components/motion';
import { OpportunityCard, OrgMark } from '@/components/recruitment';
import { Screen } from '@/components/Screen';
import { FormError, text } from '@/components/ui';

export default function OrganizationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = usePublicOrganization(slug);

  if (page.isPending || page.isError) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        {page.isPending ? <ActivityIndicator color={colors.red} /> : <FormError error={page.error} />}
      </Screen>
    );
  }

  const { organization: org, opportunities } = page.data;
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: org.name, headerShadowVisible: false, headerTintColor: colors.ink }} />
      <View style={{ height: 4, backgroundColor: org.brandColor, borderRadius: 2 }} />
      <FadeUp>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <OrgMark org={org} size={64} />
          <Text style={[text.h1, { flex: 1 }]}>{org.name}</Text>
        </View>
      </FadeUp>
      {org.description && <Text style={text.body}>{org.description}</Text>}
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        {org.website && (
          <Text accessibilityRole="link" onPress={() => void Linking.openURL(org.website!)} style={{ color: org.brandColor, fontWeight: '600' }}>
            Website
          </Text>
        )}
        {org.contactEmail && (
          <Text accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${org.contactEmail}`)} style={{ color: org.brandColor, fontWeight: '600' }}>
            {org.contactEmail}
          </Text>
        )}
      </View>

      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 20, marginTop: spacing.md }}>Open roles</Text>
      {opportunities.length === 0 ? (
        <EmptyState title="No open roles right now" body={`${org.name} isn’t recruiting at the moment.`} />
      ) : (
        opportunities.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} showOrg={false} onPress={() => router.push({ pathname: '/opportunity/[id]', params: { id: opp.id } })} />
        ))
      )}
    </Screen>
  );
}
