import { DAY_PARTS, WEEKDAYS, WEEKDAY_LABELS, type Availability, type DayPart, type Weekday } from './schemas';

export function toggleAvailability(av: Availability, day: Weekday, part: DayPart): Availability {
  const current = av[day] ?? [];
  const next = current.includes(part) ? current.filter((p) => p !== part) : [...current, part];
  return { ...av, [day]: DAY_PARTS.filter((p) => next.includes(p)) };
}

export function hasAvailability(av: Availability, day: Weekday, part: DayPart) {
  return av[day]?.includes(part) ?? false;
}

// "Mon morning, Sat morning & afternoon" style summary.
export function summarizeAvailability(av: Availability): string {
  const parts = WEEKDAYS.filter((d) => av[d]?.length).map((d) => {
    const ps = av[d]!;
    return ps.length === 3 ? `${WEEKDAY_LABELS[d]} all day` : `${WEEKDAY_LABELS[d]} ${ps.join(' & ')}`;
  });
  return parts.length ? parts.join(', ') : 'Not set';
}
