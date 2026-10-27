import {
  DAY_PARTS,
  DAY_PART_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  colors,
  hasAvailability,
  radii,
  summarizeAvailability,
  toggleAvailability,
  type Availability,
  type Department,
} from '@newreplica/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip } from './kit';
import { text } from './ui';

export function AvailabilityGrid({ value, onChange }: { value: Availability; onChange: (v: Availability) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>Availability</Text>
      <View style={styles.gridRow}>
        <View style={styles.rowLabel} />
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.dayLabel}>
            {WEEKDAY_LABELS[d].charAt(0)}
          </Text>
        ))}
      </View>
      {DAY_PARTS.map((part) => (
        <View key={part} style={styles.gridRow}>
          <Text style={[styles.rowLabel, text.muted, { fontSize: 12 }]}>{DAY_PART_LABELS[part]}</Text>
          {WEEKDAYS.map((day) => {
            const on = hasAvailability(value, day, part);
            return (
              <Pressable
                key={day}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${WEEKDAY_LABELS[day]} ${DAY_PART_LABELS[part]}`}
                onPress={() => onChange(toggleAvailability(value, day, part))}
                style={[styles.cell, on && styles.cellOn]}
              >
                {on && <Text style={{ color: colors.white, fontWeight: '700' }}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      ))}
      <Text style={[text.muted, { fontSize: 13 }]}>{summarizeAvailability(value)}</Text>
    </View>
  );
}

export function SkillsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft('');
  };
  const add = () => commit(draft);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>Skills</Text>
      {value.length > 0 && (
        <View style={styles.wrap}>
          {value.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${s}`}
              onPress={() => onChange(value.filter((x) => x !== s))}
              style={styles.skill}
            >
              <Text style={{ color: colors.ink }}>{s} ✕</Text>
            </Pressable>
          ))}
        </View>
      )}
      <TextInput
        value={draft}
        onChangeText={(v) => (v.includes(',') ? commit(v) : setDraft(v))}
        onSubmitEditing={add}
        onBlur={add}
        placeholder="First aid, Driving…"
        placeholderTextColor={colors.faint}
        returnKeyType="done"
        style={styles.input}
      />
      <Text style={[text.muted, { fontSize: 13 }]}>Tap a skill to remove it.</Text>
    </View>
  );
}

export function DepartmentPicker({ departments, value, onChange }: { departments: Department[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>Departments</Text>
      {departments.length === 0 ? (
        <Text style={text.muted}>No departments yet. Add them in Organisation settings.</Text>
      ) : (
        <View style={styles.wrap}>
          {departments.map((d) => {
            const on = value.includes(d.id);
            return <Chip key={d.id} label={d.name} selected={on} onPress={() => onChange(on ? value.filter((x) => x !== d.id) : [...value, d.id])} />;
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.ink, fontSize: 14, fontWeight: '500' },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowLabel: { width: 72 },
  dayLabel: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12, fontWeight: '600' },
  cell: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOn: { backgroundColor: colors.red, borderColor: colors.red },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skill: { backgroundColor: colors.navySoft, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 6 },
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
