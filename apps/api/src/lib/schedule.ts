import {
  addDays,
  formatShiftRange,
  isLateCancel,
  zonedParts,
  zonedToUtc,
  type EventSummary,
  type RosterEntry,
  type ShiftInput,
  type StaffShift,
} from '@newreplica/shared';
import { prisma } from '../db';
import type {
  AssignmentSource,
  Department,
  Event,
  Location,
  Membership,
  Organization,
  Prisma,
  Shift,
  ShiftAssignment,
  User,
} from '../generated/prisma/client';
import { env } from '../env';
import { HttpError } from './http';
import { sendMail } from './mailer';

type Tx = Prisma.TransactionClient;

export const ACTIVE = ['CONFIRMED', 'WAITLISTED'] as const;

// ---------- times ----------

export function shiftTimes(input: Pick<ShiftInput, 'date' | 'startTime' | 'endTime'>, timeZone: string) {
  const startsAt = zonedToUtc(input.date, input.startTime, timeZone);
  const endDate = input.endTime < input.startTime ? addDays(input.date, 1) : input.date;
  return { startsAt, endsAt: zonedToUtc(endDate, input.endTime, timeZone) };
}

// ---------- serialisers ----------

export interface Counts {
  confirmed: number;
  waitlisted: number;
}

function shiftCore(s: Shift, timeZone: string, c: Counts) {
  const start = zonedParts(s.startsAt, timeZone);
  const end = zonedParts(s.endsAt, timeZone);
  return {
    id: s.id,
    eventId: s.eventId,
    title: s.title,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    capacity: s.capacity,
    waitlistEnabled: s.waitlistEnabled,
    notes: s.notes,
    confirmedCount: c.confirmed,
    waitlistCount: c.waitlisted,
    spotsLeft: Math.max(0, s.capacity - c.confirmed),
  };
}
export { shiftCore as toShiftCore };

export const rosterInclude = { membership: { include: { user: true } } } as const;
export type AssignmentRecord = ShiftAssignment & { membership: Membership & { user: User } };

const byJoined = (a: ShiftAssignment, b: ShiftAssignment) => a.joinedAt.getTime() - b.joinedAt.getTime();

export function toRoster(assignments: AssignmentRecord[]): RosterEntry[] {
  const confirmed = assignments.filter((a) => a.status === 'CONFIRMED').sort(byJoined);
  const waitlist = assignments.filter((a) => a.status === 'WAITLISTED').sort(byJoined);
  const cancelled = assignments
    .filter((a) => a.status === 'CANCELLED')
    .sort((a, b) => (b.cancelledAt?.getTime() ?? 0) - (a.cancelledAt?.getTime() ?? 0));
  return [...confirmed, ...waitlist, ...cancelled].map((a) => ({
    id: a.id,
    volunteerId: a.membershipId,
    name: a.membership.user.name,
    email: a.membership.user.email,
    phone: a.membership.phone,
    role: a.membership.role,
    status: a.status,
    source: a.source,
    waitlistPosition: a.status === 'WAITLISTED' ? waitlist.indexOf(a) + 1 : null,
    joinedAt: a.joinedAt.toISOString(),
    promotedAt: a.promotedAt?.toISOString() ?? null,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
    cancelReason: a.cancelReason,
    lateCancel: a.lateCancel,
  }));
}

function countsOf(assignments: Pick<ShiftAssignment, 'status'>[]): Counts {
  return {
    confirmed: assignments.filter((a) => a.status === 'CONFIRMED').length,
    waitlisted: assignments.filter((a) => a.status === 'WAITLISTED').length,
  };
}

export function toStaffShift(s: Shift & { assignments: AssignmentRecord[] }, timeZone: string): StaffShift {
  return { ...shiftCore(s, timeZone, countsOf(s.assignments)), roster: toRoster(s.assignments) };
}

export const eventInclude = { location: true, department: true } as const;
type EventRecord = Event & { location: Location | null; department: Department | null };

export function eventCore(e: EventRecord, shifts: Shift[], timeZone: string) {
  const starts = shifts.map((s) => s.startsAt.getTime());
  const ends = shifts.map((s) => s.endsAt.getTime());
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location ? { id: e.location.id, name: e.location.name, address: e.location.address } : null,
    department: e.department ? { id: e.department.id, name: e.department.name } : null,
    timezone: timeZone,
    startsAt: shifts.length ? new Date(Math.min(...starts)).toISOString() : null,
    endsAt: shifts.length ? new Date(Math.max(...ends)).toISOString() : null,
  };
}

export function toEventSummary(e: EventRecord, shifts: (Shift & { counts: Counts })[], timeZone: string, now = new Date()): EventSummary {
  const sum = (f: (s: (typeof shifts)[number]) => number) => shifts.reduce((n, s) => n + f(s), 0);
  return {
    ...eventCore(e, shifts, timeZone),
    status: e.status,
    shiftCount: shifts.length,
    capacity: sum((s) => s.capacity),
    confirmedCount: sum((s) => s.counts.confirmed),
    waitlistCount: sum((s) => s.counts.waitlisted),
    openSpots: e.status === 'CANCELLED' ? 0 : sum((s) => (s.startsAt > now ? Math.max(0, s.capacity - s.counts.confirmed) : 0)),
    publishedAt: e.publishedAt?.toISOString() ?? null,
    cancelledAt: e.cancelledAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function shiftCounts(shiftIds: string[]) {
  const rows = await prisma.shiftAssignment.groupBy({
    by: ['shiftId', 'status'],
    where: { shiftId: { in: shiftIds }, status: { in: [...ACTIVE] } },
    _count: { _all: true },
  });
  const map = new Map<string, Counts>(shiftIds.map((id) => [id, { confirmed: 0, waitlisted: 0 }]));
  for (const r of rows) {
    const c = map.get(r.shiftId)!;
    if (r.status === 'CONFIRMED') c.confirmed = r._count._all;
    else c.waitlisted = r._count._all;
  }
  return map;
}

export async function loadEventDetail(organizationId: string, id: string) {
  const e = await prisma.event.findFirst({
    where: { id, organizationId },
    include: {
      ...eventInclude,
      organization: true,
      shifts: { include: { assignments: { include: rosterInclude } }, orderBy: [{ startsAt: 'asc' }, { title: 'asc' }] },
    },
  });
  if (!e) throw new HttpError(404, 'Event not found');
  const tz = e.organization.timezone;
  const summary = toEventSummary(
    e,
    e.shifts.map((s) => ({ ...s, counts: countsOf(s.assignments) })),
    tz,
  );
  return { ...summary, shifts: e.shifts.map((s) => toStaffShift(s, tz)) };
}

export async function loadStaffShift(organizationId: string, id: string) {
  const s = await prisma.shift.findFirst({
    where: { id, organizationId },
    include: { assignments: { include: rosterInclude }, organization: true },
  });
  if (!s) throw new HttpError(404, 'Shift not found');
  return toStaffShift(s, s.organization.timezone);
}

export async function waitlistPosition(tx: Tx | typeof prisma, a: Pick<ShiftAssignment, 'shiftId' | 'joinedAt' | 'status'>) {
  if (a.status !== 'WAITLISTED') return null;
  return 1 + (await tx.shiftAssignment.count({ where: { shiftId: a.shiftId, status: 'WAITLISTED', joinedAt: { lt: a.joinedAt } } }));
}

// ---------- rota rules ----------

// Serialises every capacity decision on a shift so two people can never take the last place.
async function lockShift(tx: Tx, shiftId: string) {
  await tx.$queryRaw`SELECT id FROM "Shift" WHERE id = ${shiftId} FOR UPDATE`;
}

async function assertNoClash(tx: Tx, shift: Shift, membershipId: string, who: string) {
  const clash = await tx.shiftAssignment.findFirst({
    where: {
      membershipId,
      status: { in: [...ACTIVE] },
      shiftId: { not: shift.id },
      shift: { startsAt: { lt: shift.endsAt }, endsAt: { gt: shift.startsAt }, event: { status: { not: 'CANCELLED' } } },
    },
    include: { shift: { include: { event: true } } },
  });
  if (clash) {
    throw new HttpError(409, `${who} already on "${clash.shift.event.title}: ${clash.shift.title}" at that time`);
  }
}

// Confirms the person if there's room, otherwise adds them to the waitlist (or refuses when the waitlist is off).
export async function placeOnShift(tx: Tx, shift: Shift, membershipId: string, source: AssignmentSource, who: { self: boolean; name: string }) {
  await lockShift(tx, shift.id);
  const existing = await tx.shiftAssignment.findUnique({ where: { shiftId_membershipId: { shiftId: shift.id, membershipId } } });
  if (existing && existing.status !== 'CANCELLED') {
    const where = existing.status === 'CONFIRMED' ? 'on this shift' : 'on the waitlist for this shift';
    throw new HttpError(409, who.self ? `You're already ${where}` : `${who.name} is already ${where}`);
  }
  await assertNoClash(tx, shift, membershipId, who.self ? "You're" : `${who.name} is`);

  const confirmed = await tx.shiftAssignment.count({ where: { shiftId: shift.id, status: 'CONFIRMED' } });
  if (confirmed >= shift.capacity && !shift.waitlistEnabled) throw new HttpError(409, 'This shift is full');
  const status = confirmed < shift.capacity ? 'CONFIRMED' : 'WAITLISTED';

  const data = {
    status,
    source,
    joinedAt: new Date(),
    promotedAt: null,
    cancelledAt: null,
    cancelledById: null,
    cancelReason: null,
    lateCancel: false,
  } as const;
  return existing
    ? tx.shiftAssignment.update({ where: { id: existing.id }, data })
    : tx.shiftAssignment.create({ data: { ...data, shiftId: shift.id, membershipId, organizationId: shift.organizationId } });
}

// Fills free places from the front of the waitlist. Returns the ids of the people moved up.
export async function promoteWaitlist(tx: Tx, shiftId: string): Promise<string[]> {
  await lockShift(tx, shiftId);
  const shift = await tx.shift.findUniqueOrThrow({ where: { id: shiftId } });
  if (shift.startsAt <= new Date()) return [];
  const confirmed = await tx.shiftAssignment.count({ where: { shiftId, status: 'CONFIRMED' } });
  const open = shift.capacity - confirmed;
  if (open <= 0) return [];
  const next = await tx.shiftAssignment.findMany({
    where: { shiftId, status: 'WAITLISTED' },
    orderBy: { joinedAt: 'asc' },
    take: open,
    select: { id: true },
  });
  if (!next.length) return [];
  const ids = next.map((a) => a.id);
  await tx.shiftAssignment.updateMany({ where: { id: { in: ids } }, data: { status: 'CONFIRMED', promotedAt: new Date() } });
  return ids;
}

export async function cancelAssignment(
  tx: Tx,
  assignment: ShiftAssignment,
  shift: Shift,
  opts: { byUserId: string; reason: string | null; byVolunteer: boolean },
) {
  await lockShift(tx, shift.id);
  const wasConfirmed = assignment.status === 'CONFIRMED';
  const { count } = await tx.shiftAssignment.updateMany({
    where: { id: assignment.id, status: { in: [...ACTIVE] } },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledById: opts.byUserId,
      cancelReason: opts.reason,
      // Only a volunteer pulling out of a confirmed place counts as a late cancellation.
      lateCancel: opts.byVolunteer && wasConfirmed && isLateCancel(shift.startsAt),
    },
  });
  if (count !== 1) throw new HttpError(409, 'This place has already been cancelled');
  const promoted = wasConfirmed ? await promoteWaitlist(tx, shift.id) : [];
  return { wasConfirmed, promoted };
}

// Cancels every active place on the given shifts (event cancelled, shift deleted, volunteer removed).
// Returns the people who held places on shifts that haven't started, so they can be told.
export async function cancelAllOnShifts(tx: Tx, where: Prisma.ShiftAssignmentWhereInput, opts: { byUserId: string; reason: string | null }) {
  const affected = await tx.shiftAssignment.findMany({
    where: { ...where, status: { in: [...ACTIVE] } },
    include: { ...rosterInclude, shift: true },
  });
  if (!affected.length) return [];
  await tx.shiftAssignment.updateMany({
    where: { id: { in: affected.map((a) => a.id) } },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById: opts.byUserId, cancelReason: opts.reason },
  });
  const now = new Date();
  return affected.filter((a) => a.shift.startsAt > now);
}

// ---------- email ----------

type ShiftForMail = Pick<Shift, 'title' | 'startsAt' | 'endsAt'>;
type EventForMail = Pick<Event, 'title'> & { location?: Pick<Location, 'name' | 'address'> | null };

function when(shift: ShiftForMail, org: Organization) {
  return formatShiftRange(shift.startsAt.toISOString(), shift.endsAt.toISOString(), org.timezone);
}

function shiftLines(org: Organization, event: EventForMail, shift: ShiftForMail) {
  const where = event.location ? `\nWhere: ${event.location.name}${event.location.address ? `, ${event.location.address}` : ''}` : '';
  return `Event: ${event.title}\nRole: ${shift.title}\nWhen: ${when(shift, org)}${where}`;
}

const myShiftsLink = () => `See your shifts: ${env.WEB_APP_URL}/app/my-shifts`;

export const scheduleEmails = {
  placed: (to: User, org: Organization, event: EventForMail, shift: ShiftForMail, status: 'CONFIRMED' | 'WAITLISTED', position: number | null, byStaff: boolean) =>
    sendMail({
      to: to.email,
      subject: status === 'CONFIRMED' ? `Confirmed: ${event.title}, ${when(shift, org)}` : `You're on the waitlist: ${event.title}`,
      text:
        `Hi ${to.name},\n\n` +
        (status === 'CONFIRMED'
          ? `${byStaff ? `${org.name} has put you on this shift` : "You're confirmed for this shift"}.\n\n`
          : `This shift is full, so ${byStaff ? `${org.name} has added you` : "you're"} on the waitlist${position ? ` at number ${position}` : ''}. We'll email you if a place opens up.\n\n`) +
        `${shiftLines(org, event, shift)}\n\nCan't make it? Cancel as early as you can so someone else can take your place.\n${myShiftsLink()}\n`,
    }),
  promoted: (to: User, org: Organization, event: EventForMail, shift: ShiftForMail) =>
    sendMail({
      to: to.email,
      subject: `A place opened up: you're confirmed for ${event.title}`,
      text: `Hi ${to.name},\n\nGood news: a place opened up and you've moved off the waitlist. You're now confirmed.\n\n${shiftLines(org, event, shift)}\n\n${myShiftsLink()}\n`,
    }),
  cancelledBySelf: (to: User, org: Organization, event: EventForMail, shift: ShiftForMail, wasConfirmed: boolean) =>
    sendMail({
      to: to.email,
      subject: `Cancelled: ${event.title}, ${when(shift, org)}`,
      text: `Hi ${to.name},\n\nYou've ${wasConfirmed ? 'cancelled your place on' : 'left the waitlist for'} this shift. Thanks for letting ${org.name} know.\n\n${shiftLines(org, event, shift)}\n`,
    }),
  removed: (to: User, org: Organization, event: EventForMail, shift: ShiftForMail, reason: string | null) =>
    sendMail({
      to: to.email,
      subject: `Change to your shift: ${event.title}`,
      text: `Hi ${to.name},\n\n${org.name} has taken you off this shift.${reason ? `\n\nMessage from the team: ${reason}` : ''}\n\n${shiftLines(org, event, shift)}\n`,
    }),
  shiftCancelled: (to: User, org: Organization, event: EventForMail, shift: ShiftForMail, reason: string | null) =>
    sendMail({
      to: to.email,
      subject: `Cancelled by ${org.name}: ${event.title}, ${when(shift, org)}`,
      text: `Hi ${to.name},\n\n${org.name} has cancelled this shift, so you don't need to come.${reason ? `\n\nMessage from the team: ${reason}` : ''}\n\n${shiftLines(org, event, shift)}\n`,
    }),
  timeChanged: (to: User, org: Organization, event: EventForMail, shift: ShiftForMail) =>
    sendMail({
      to: to.email,
      subject: `New time for your shift: ${event.title}`,
      text: `Hi ${to.name},\n\nThe time of your shift has changed. Here are the new details:\n\n${shiftLines(org, event, shift)}\n\nIf you can no longer make it, please cancel so someone else can take your place.\n${myShiftsLink()}\n`,
    }),
  needsCover: (to: User, org: Organization, event: EventForMail & { id: string }, shift: ShiftForMail, volunteer: string, late: boolean) =>
    sendMail({
      to: to.email,
      subject: `${late ? 'Late cancellation' : 'Cover needed'}: ${event.title}, ${when(shift, org)}`,
      text: `Hi ${to.name},\n\n${volunteer} has cancelled${late ? ` less than a day before the start` : ''} and nobody is on the waitlist, so this shift now has a free place.\n\n${shiftLines(org, event, shift)}\n\nFind cover: ${env.WEB_APP_URL}/app/schedule/${event.id}\n`,
    }),
};

export async function shiftManagers(organizationId: string) {
  const staff = await prisma.membership.findMany({
    where: { organizationId, role: { in: ['ORG_ADMIN', 'COORDINATOR'] }, status: 'ACTIVE', user: { disabled: false } },
    include: { user: true },
  });
  return staff.map((m) => m.user);
}

// Sends the follow-up emails for a cancellation: the people promoted, and the coordinators if a place is left unfilled.
export async function notifyAfterCancel(
  org: Organization,
  event: EventForMail & { id: string },
  shift: Shift,
  result: { wasConfirmed: boolean; promoted: string[] },
  volunteer: { name: string; late: boolean } | null,
) {
  if (result.promoted.length) {
    const people = await prisma.shiftAssignment.findMany({ where: { id: { in: result.promoted } }, include: rosterInclude });
    for (const p of people) await scheduleEmails.promoted(p.membership.user, org, event, shift);
  } else if (result.wasConfirmed && volunteer && shift.startsAt > new Date()) {
    for (const m of await shiftManagers(org.id)) await scheduleEmails.needsCover(m, org, event, shift, volunteer.name, volunteer.late);
  }
}

// Before a membership is deleted: give up the person's future places so the waitlist moves up.
export async function releaseFuturePlaces(membershipId: string, byUserId: string, org: Organization) {
  const places = await prisma.shiftAssignment.findMany({
    where: { membershipId, status: { in: [...ACTIVE] }, shift: { startsAt: { gt: new Date() } } },
    include: { shift: { include: { event: { include: { location: true } } } } },
  });
  for (const a of places) {
    const result = await prisma.$transaction((tx) => cancelAssignment(tx, a, a.shift, { byUserId, reason: 'Removed from the organisation', byVolunteer: false }));
    await notifyAfterCancel(org, a.shift.event, a.shift, result, null);
  }
}
