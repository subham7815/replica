import {
  APPLICATION_STATUS_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  colors,
  radii,
  spacing,
  type ApplicationStatus,
  type OpportunityStatus,
  type PublicOpportunity,
  type PublicOrganization,
  type Question,
} from '@newreplica/shared';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip } from './kit';
import { PulseDot } from './motion';
import { Card, text } from './ui';

export function OrgMark({ org, size = 40 }: { org: Pick<PublicOrganization, 'name' | 'logoUrl' | 'brandColor'>; size?: number }) {
  if (org.logoUrl?.startsWith('https://')) {
    return <Image source={{ uri: org.logoUrl }} style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: colors.white }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: org.brandColor, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.white, fontWeight: '700', fontSize: size * 0.42 }}>{org.name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function SignupModeBadge({ mode }: { mode: PublicOpportunity['signupMode'] }) {
  const open = mode === 'OPEN';
  return (
    <View style={[styles.pill, { backgroundColor: open ? colors.greenSoft : colors.navySoft }]}>
      <Text style={[styles.pillText, { color: open ? colors.green : colors.navy }]}>{open ? '✓ Join instantly' : 'Apply'}</Text>
    </View>
  );
}

export function OpportunityCard({ opp, showOrg = true, onPress }: { opp: PublicOpportunity; showOrg?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && { transform: [{ translateY: 1 }], opacity: 0.92 }]}>
      <Card style={{ padding: spacing.lg, gap: 6 }}>
        {showOrg && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 }}>
            <OrgMark org={opp.organization} size={28} />
            <Text style={[text.muted, { flex: 1 }]} numberOfLines={1}>
              {opp.organization.name}
            </Text>
          </View>
        )}
        <Text style={styles.title}>{opp.title}</Text>
        <Text style={[text.body, { fontSize: 14 }]} numberOfLines={2}>
          {opp.summary}
        </Text>
        {opp.commitment && <Text style={styles.meta}>When: {opp.commitment}</Text>}
        {opp.location && (
          <Text style={styles.meta} numberOfLines={1}>
            Where: {opp.location.name}
            {opp.location.address ? `, ${opp.location.address}` : ''}
          </Text>
        )}
        <View style={styles.cardFooter}>
          <SignupModeBadge mode={opp.signupMode} />
          <Text style={{ color: colors.red, fontWeight: '700' }}>View ›</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export function QuestionField({
  question,
  value,
  onChange,
  error,
}: {
  question: Question;
  value: string | boolean | undefined;
  onChange: (v: string | boolean | undefined) => void;
  error?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>
        {question.label}
        {question.required && <Text style={{ color: colors.red }}> *</Text>}
      </Text>
      {question.type === 'yesno' ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Chip label="Yes" selected={value === true} onPress={() => onChange(true)} />
          <Chip label="No" selected={value === false} onPress={() => onChange(false)} />
        </View>
      ) : question.type === 'select' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {question.options?.map((o) => (
            <Chip key={o} label={o} selected={value === o} onPress={() => onChange(value === o ? undefined : o)} />
          ))}
        </View>
      ) : (
        <TextInput
          value={(value as string) ?? ''}
          onChangeText={onChange}
          multiline={question.type === 'textarea'}
          accessibilityLabel={question.label}
          style={[styles.input, question.type === 'textarea' && { minHeight: 96, textAlignVertical: 'top' }, error ? { borderColor: colors.red } : null]}
        />
      )}
      {error && <Text style={{ color: colors.red, fontSize: 13 }}>{error}</Text>}
    </View>
  );
}

const OPP_STATUS: Record<OpportunityStatus, { fg: string; bg: string }> = {
  DRAFT: { fg: colors.muted, bg: colors.navySoft },
  PUBLISHED: { fg: colors.green, bg: colors.greenSoft },
  CLOSED: { fg: colors.muted, bg: colors.lineSoft },
};

export function OpportunityStatusBadge({ status }: { status: OpportunityStatus }) {
  const c = OPP_STATUS[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{OPPORTUNITY_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const APP_STATUS: Record<ApplicationStatus, { fg: string; bg: string }> = {
  PENDING: { fg: colors.amber, bg: colors.amberSoft },
  APPROVED: { fg: colors.green, bg: colors.greenSoft },
  REJECTED: { fg: colors.muted, bg: colors.navySoft },
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const c = APP_STATUS[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
      {status === 'PENDING' && <PulseDot color={c.fg} />}
      <Text style={[styles.pillText, { color: c.fg }]}>{APPLICATION_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  label: { color: colors.ink, fontSize: 14, fontWeight: '500' },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
});
