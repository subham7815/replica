import { MEMBER_STATUS_LABELS, colors, radii, spacing, type MemberStatus } from '@newreplica/shared';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PulseDot } from './motion';
import { text } from './ui';

const STATUS_COLORS: Record<MemberStatus, { fg: string; bg: string }> = {
  ACTIVE: { fg: colors.green, bg: colors.greenSoft },
  INVITED: { fg: colors.amber, bg: colors.amberSoft },
  INACTIVE: { fg: colors.muted, bg: colors.navySoft },
  SUSPENDED: { fg: colors.red, bg: colors.redSoft },
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {status === 'INVITED' ? <PulseDot color={c.fg} /> : <View style={[styles.dot, { backgroundColor: c.fg }]} />}
      <Text style={[styles.badgeText, { color: c.fg }]}>{MEMBER_STATUS_LABELS[status]}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && { transform: [{ translateY: 1 }] }]}
    >
      <Text style={[styles.chipText, selected && { color: colors.red }]}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </ScrollView>
    </View>
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={[text.body, { flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.red, false: colors.lineStrong }} thumbColor={colors.white} />
    </View>
  );
}

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body && <Text style={[text.muted, { textAlign: 'center' }]}>{body}</Text>}
      {children && <View style={{ marginTop: spacing.md, alignSelf: 'stretch', gap: spacing.sm }}>{children}</View>}
    </View>
  );
}

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top', 'bottom']}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
            <Text style={text.link}>Close</Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function SavedNote({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <Text style={{ color: colors.green, fontWeight: '600', textAlign: 'center' }}>✓ Saved</Text>;
}

export function ListRow({ title, subtitle, right, onPress }: { title: string; subtitle?: string | null; right?: ReactNode; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.redSoft }]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={text.muted} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.full, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  label: { color: colors.ink, fontSize: 14, fontWeight: '500' },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { borderColor: colors.red, backgroundColor: colors.redSoft },
  chipText: { color: colors.text, fontWeight: '500', fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  empty: {
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    borderRadius: radii.lg,
    padding: spacing.xl,
    backgroundColor: '#ffffff99',
  },
  emptyTitle: { color: colors.ink, fontWeight: '600', fontSize: 16 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  sheetTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14, paddingHorizontal: spacing.lg, backgroundColor: colors.white },
  rowTitle: { color: colors.ink, fontWeight: '600', fontSize: 15 },
});
