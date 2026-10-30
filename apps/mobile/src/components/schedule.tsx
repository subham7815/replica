import { EVENT_STATUS_LABELS, colors, radii, type EventStatus } from '@newreplica/shared';
import { StyleSheet, Text, View } from 'react-native';

const EVENT_STATUS_COLORS: Record<EventStatus, { fg: string; bg: string }> = {
  DRAFT: { fg: colors.muted, bg: colors.navySoft },
  PUBLISHED: { fg: colors.green, bg: colors.greenSoft },
  CANCELLED: { fg: colors.red, bg: colors.redSoft },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const c = EVENT_STATUS_COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text style={[styles.badgeText, { color: c.fg }]}>{EVENT_STATUS_LABELS[status]}</Text>
    </View>
  );
}

export function FillBar({ confirmed, capacity }: { confirmed: number; capacity: number }) {
  const pct = capacity ? Math.min(100, Math.round((confirmed / capacity) * 100)) : 0;
  const full = capacity > 0 && confirmed >= capacity;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${confirmed} of ${capacity} places filled`}
      accessibilityValue={{ min: 0, max: capacity, now: confirmed }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: full ? colors.green : colors.red }]} />
    </View>
  );
}

export function PlacesLabel({ confirmed, capacity, waitlist }: { confirmed: number; capacity: number; waitlist: number }) {
  const left = Math.max(0, capacity - confirmed);
  return (
    <Text style={{ fontSize: 13, fontWeight: '500' }}>
      <Text style={{ color: colors.ink }}>
        {confirmed}/{capacity} filled
      </Text>
      {left > 0 ? <Text style={{ color: colors.red }}> · {left} open</Text> : <Text style={{ color: colors.green }}> · Full</Text>}
      {waitlist > 0 && <Text style={{ color: colors.amber }}> · {waitlist} waiting</Text>}
    </Text>
  );
}

export function PlacePill({ status, position }: { status: 'CONFIRMED' | 'WAITLISTED'; position: number | null }) {
  const confirmed = status === 'CONFIRMED';
  return (
    <View style={[styles.badge, { backgroundColor: confirmed ? colors.greenSoft : colors.amberSoft }]}>
      <Text style={[styles.badgeText, { color: confirmed ? colors.green : colors.amber, fontWeight: '600' }]}>
        {confirmed ? '✓ Confirmed' : `Waitlist${position ? ` #${position}` : ''}`}
      </Text>
    </View>
  );
}

export function Tag({ label, tone = 'navy' }: { label: string; tone?: 'navy' | 'red' }) {
  return (
    <View style={[styles.badge, { backgroundColor: tone === 'red' ? colors.redSoft : colors.navySoft }]}>
      <Text style={[styles.badgeText, { color: tone === 'red' ? colors.red : colors.navy, fontSize: 11, fontWeight: '600' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.full, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.lineSoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
