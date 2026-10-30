import type { DayPart, Weekday } from './schemas';

// Wall-clock helpers for an organisation's time zone. Shift times are entered and shown in the organisation's
// zone (not the viewer's), so a London food bank's 9:00 shift reads 9:00 for everyone.

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

export interface ZonedParts {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  weekday: Weekday;
  hour: number;
}

export function zonedParts(at: Date | string, timeZone: string): ZonedParts {
  const p: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(new Date(at))) p[part.type] = part.value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    weekday: p.weekday!.toLowerCase().slice(0, 3) as Weekday,
    hour: Number(p.hour),
  };
}

function offsetMs(utcMs: number, timeZone: string) {
  const p: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

// "2026-11-07" + "09:00" in Europe/London → the UTC instant. Times that don't exist (clocks going forward)
// resolve to the later offset, like most calendar apps.
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y!, m! - 1, d!, hh!, mm!);
  const first = guess - offsetMs(guess, timeZone);
  const second = guess - offsetMs(first, timeZone);
  return new Date(second);
}

export function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y!, m! - 1, d! + days));
  return t.toISOString().slice(0, 10);
}

export function dayPartOf(hour: number): DayPart {
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

// "Sat 7 Nov"
export function formatDay(at: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(at));
}

// "Sat 7 Nov, 09:00–12:00" (adds the end date when a shift runs past midnight)
export function formatShiftRange(startsAt: string, endsAt: string, timeZone: string) {
  const s = zonedParts(startsAt, timeZone);
  const e = zonedParts(endsAt, timeZone);
  const end = s.date === e.date ? e.time : `${formatDay(endsAt, timeZone)} ${e.time}`;
  return `${formatDay(startsAt, timeZone)}, ${s.time}–${end}`;
}

export function formatTimeRange(startsAt: string, endsAt: string, timeZone: string) {
  const s = zonedParts(startsAt, timeZone);
  const e = zonedParts(endsAt, timeZone);
  return `${s.time}–${e.time}${s.date === e.date ? '' : ' (+1 day)'}`;
}

export function todayIn(timeZone: string) {
  return zonedParts(new Date(), timeZone).date;
}
