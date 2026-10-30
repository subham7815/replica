import {
  assignInput,
  cancelInput,
  dayPartOf,
  eventInput,
  eventListQuery,
  hasAvailability,
  isLateCancel,
  availabilitySchema,
  shiftInput,
  zonedParts,
  type CoverCandidate,
  type MyShift,
  type OpenEvent,
} from '@newreplica/shared';
import { Router, type Request } from 'express';
import { prisma } from '../db';
import type { Membership, Shift } from '../generated/prisma/client';
import { HttpError } from '../lib/http';
import {
  ACTIVE,
  cancelAllOnShifts,
  cancelAssignment,
  eventCore,
  eventInclude,
  loadEventDetail,
  loadStaffShift,
  notifyAfterCancel,
  placeOnShift,
  promoteWaitlist,
  scheduleEmails,
  shiftCounts,
  shiftTimes,
  toEventSummary,
  toShiftCore,
  waitlistPosition,
} from '../lib/schedule';
import { orgId, requireAuth, requireOrg, requirePermission } from '../middleware/auth';

const org = (req: Request) => req.auth!.membership!.organization;
const param = (req: Request, name = 'id') => String(req.params[name]);

async function assertOwnRefs(organizationId: string, input: { locationId?: string | null; departmentId?: string | null }) {
  if (input.locationId && !(await prisma.location.count({ where: { id: input.locationId, organizationId } }))) {
    throw new HttpError(400, 'That location doesn’t exist');
  }
  if (input.departmentId && !(await prisma.department.count({ where: { id: input.departmentId, organizationId } }))) {
    throw new HttpError(400, 'That department doesn’t exist');
  }
}

async function findEvent(organizationId: string, id: string) {
  const e = await prisma.event.findFirst({ where: { id, organizationId }, include: eventInclude });
  if (!e) throw new HttpError(404, 'Event not found');
  return e;
}

async function findShift(organizationId: string, id: string) {
  const s = await prisma.shift.findFirst({ where: { id, organizationId }, include: { event: { include: eventInclude } } });
  if (!s) throw new HttpError(404, 'Shift not found');
  return s;
}

function assertEditable(event: { status: string }) {
  if (event.status === 'CANCELLED') throw new HttpError(409, 'This event is cancelled, so it can’t be changed');
}

// ---------- events (coordinators) ----------

export const eventsRouter = Router();
eventsRouter.use(requireAuth, requireOrg);

eventsRouter.get('/', requirePermission('shifts:manage'), async (req, res) => {
  const { scope } = eventListQuery.parse(req.query);
  const organizationId = orgId(req);
  const events = await prisma.event.findMany({ where: { organizationId }, include: { ...eventInclude, shifts: true } });
  const counts = await shiftCounts(events.flatMap((e) => e.shifts.map((s) => s.id)));
  const now = new Date();
  const tz = org(req).timezone;

  const summaries = events
    .map((e) => toEventSummary(e, e.shifts.map((s) => ({ ...s, counts: counts.get(s.id)! })), tz, now))
    .filter((e) => {
      if (scope === 'all') return true;
      const finished = e.status === 'CANCELLED' || (e.endsAt !== null && new Date(e.endsAt) < now);
      return scope === 'past' ? finished : !finished;
    });
  // Upcoming: events still being set up (no shifts) first, then soonest. Past: most recent first.
  const key = (e: (typeof summaries)[number]) => (e.startsAt ? new Date(e.startsAt).getTime() : -Infinity);
  summaries.sort((a, b) => (scope === 'upcoming' ? key(a) - key(b) : key(b) - key(a)));
  res.json(summaries);
});

eventsRouter.post('/', requirePermission('programmes:manage'), async (req, res) => {
  const input = eventInput.parse(req.body);
  const organizationId = orgId(req);
  await assertOwnRefs(organizationId, input);
  const e = await prisma.event.create({
    data: { ...input, organizationId, publishedAt: input.status === 'PUBLISHED' ? new Date() : null },
  });
  res.status(201).json(await loadEventDetail(organizationId, e.id));
});

eventsRouter.get('/:id', requirePermission('shifts:manage'), async (req, res) => {
  res.json(await loadEventDetail(orgId(req), param(req)));
});

eventsRouter.patch('/:id', requirePermission('programmes:manage'), async (req, res) => {
  const input = eventInput.partial().parse(req.body);
  const organizationId = orgId(req);
  const current = await findEvent(organizationId, param(req));
  assertEditable(current);
  await assertOwnRefs(organizationId, input);
  if (input.status === 'DRAFT' && current.status === 'PUBLISHED') {
    const signedUp = await prisma.shiftAssignment.count({
      where: { shift: { eventId: current.id, startsAt: { gt: new Date() } }, status: { in: [...ACTIVE] } },
    });
    if (signedUp) {
      throw new HttpError(409, `${signedUp} ${signedUp === 1 ? 'person is' : 'people are'} signed up, so it can’t go back to draft. Cancel the event instead.`);
    }
  }
  await prisma.event.update({
    where: { id: current.id },
    data: { ...input, ...(input.status === 'PUBLISHED' && !current.publishedAt ? { publishedAt: new Date() } : {}) },
  });
  res.json(await loadEventDetail(organizationId, current.id));
});

// Cancelling keeps the event and its rota for the record and tells everyone with a place.
eventsRouter.post('/:id/cancel', requirePermission('programmes:manage'), async (req, res) => {
  const { reason } = cancelInput.parse(req.body ?? {});
  const organizationId = orgId(req);
  const current = await findEvent(organizationId, param(req));
  assertEditable(current);
  const affected = await prisma.$transaction(async (tx) => {
    const { count } = await tx.event.updateMany({
      where: { id: current.id, status: { not: 'CANCELLED' } },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (count !== 1) throw new HttpError(409, 'This event is already cancelled');
    return cancelAllOnShifts(tx, { shift: { eventId: current.id } }, { byUserId: req.auth!.user.id, reason: reason ?? null });
  });
  for (const a of affected) await scheduleEmails.shiftCancelled(a.membership.user, org(req), current, a.shift, reason ?? null);
  res.json(await loadEventDetail(organizationId, current.id));
});

eventsRouter.delete('/:id', requirePermission('programmes:manage'), async (req, res) => {
  const current = await findEvent(orgId(req), param(req));
  const affected = await prisma.$transaction(async (tx) => {
    const people = await cancelAllOnShifts(tx, { shift: { eventId: current.id } }, { byUserId: req.auth!.user.id, reason: null });
    await tx.event.delete({ where: { id: current.id } });
    return people;
  });
  if (current.status !== 'CANCELLED') {
    for (const a of affected) await scheduleEmails.shiftCancelled(a.membership.user, org(req), current, a.shift, null);
  }
  res.json({ ok: true });
});

eventsRouter.post('/:id/shifts', requirePermission('shifts:manage'), async (req, res) => {
  const input = shiftInput.parse(req.body);
  const organizationId = orgId(req);
  const event = await findEvent(organizationId, param(req));
  assertEditable(event);
  const shift = await prisma.shift.create({
    data: {
      eventId: event.id,
      organizationId,
      title: input.title,
      capacity: input.capacity,
      waitlistEnabled: input.waitlistEnabled,
      notes: input.notes ?? null,
      ...shiftTimes(input, org(req).timezone),
    },
  });
  res.status(201).json(await loadStaffShift(organizationId, shift.id));
});

// ---------- shifts (coordinators) ----------

export const shiftsRouter = Router();
shiftsRouter.use(requireAuth, requireOrg, requirePermission('shifts:manage'));

shiftsRouter.patch('/:id', async (req, res) => {
  const input = shiftInput.parse(req.body);
  const organizationId = orgId(req);
  const current = await findShift(organizationId, param(req));
  assertEditable(current.event);
  const times = shiftTimes(input, org(req).timezone);
  const moved = times.startsAt.getTime() !== current.startsAt.getTime() || times.endsAt.getTime() !== current.endsAt.getTime();

  const promoted = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Shift" WHERE id = ${current.id} FOR UPDATE`;
    const confirmed = await tx.shiftAssignment.count({ where: { shiftId: current.id, status: 'CONFIRMED' } });
    if (input.capacity < confirmed) {
      throw new HttpError(409, `${confirmed} people are already confirmed. Remove someone before lowering the places to ${input.capacity}.`);
    }
    await tx.shift.update({
      where: { id: current.id },
      data: { title: input.title, capacity: input.capacity, waitlistEnabled: input.waitlistEnabled, notes: input.notes ?? null, ...times },
    });
    return promoteWaitlist(tx, current.id);
  });

  const updated = await prisma.shift.findUniqueOrThrow({ where: { id: current.id } });
  if (moved && updated.startsAt > new Date()) {
    const people = await prisma.shiftAssignment.findMany({
      where: { shiftId: current.id, status: { in: [...ACTIVE] }, id: { notIn: promoted } },
      include: { membership: { include: { user: true } } },
    });
    for (const p of people) await scheduleEmails.timeChanged(p.membership.user, org(req), current.event, updated);
  }
  await notifyAfterCancel(org(req), current.event, updated, { wasConfirmed: false, promoted }, null);
  res.json(await loadStaffShift(organizationId, current.id));
});

shiftsRouter.delete('/:id', async (req, res) => {
  const current = await findShift(orgId(req), param(req));
  const affected = await prisma.$transaction(async (tx) => {
    const people = await cancelAllOnShifts(tx, { shiftId: current.id }, { byUserId: req.auth!.user.id, reason: null });
    await tx.shift.delete({ where: { id: current.id } });
    return people;
  });
  if (current.event.status !== 'CANCELLED') {
    for (const a of affected) await scheduleEmails.shiftCancelled(a.membership.user, org(req), current.event, a.shift, null);
  }
  res.json({ ok: true });
});

const PLACEABLE = ['ACTIVE', 'INVITED'];

shiftsRouter.post('/:id/assignments', async (req, res) => {
  const { volunteerId } = assignInput.parse(req.body);
  const organizationId = orgId(req);
  const shift = await findShift(organizationId, param(req));
  assertEditable(shift.event);
  if (shift.endsAt <= new Date()) throw new HttpError(409, 'This shift has already finished');
  const member = await prisma.membership.findFirst({ where: { id: volunteerId, organizationId }, include: { user: true } });
  if (!member) throw new HttpError(404, 'Volunteer not found');
  if (!PLACEABLE.includes(member.status)) {
    throw new HttpError(409, `${member.user.name} is ${member.status === 'SUSPENDED' ? 'suspended' : 'inactive'}, so they can’t be given shifts`);
  }

  const placed = await prisma.$transaction((tx) => placeOnShift(tx, shift, member.id, 'STAFF', { self: false, name: member.user.name }));
  await scheduleEmails.placed(member.user, org(req), shift.event, shift, placed.status as 'CONFIRMED' | 'WAITLISTED', await waitlistPosition(prisma, placed), true);
  res.status(201).json(await loadStaffShift(organizationId, shift.id));
});

// Volunteers ranked for covering a gap: free at that time first, then in the event's department, then fewest upcoming shifts.
shiftsRouter.get('/:id/cover-candidates', async (req, res) => {
  const organizationId = orgId(req);
  const shift = await findShift(organizationId, param(req));
  const now = new Date();
  const members = await prisma.membership.findMany({
    where: {
      organizationId,
      role: 'VOLUNTEER',
      status: { in: ['ACTIVE', 'INVITED'] },
      assignments: {
        none: {
          status: { in: [...ACTIVE] },
          OR: [{ shiftId: shift.id }, { shift: { startsAt: { lt: shift.endsAt }, endsAt: { gt: shift.startsAt }, event: { status: { not: 'CANCELLED' } } } }],
        },
      },
    },
    include: {
      user: true,
      departments: { select: { id: true } },
      _count: { select: { assignments: { where: { status: 'CONFIRMED', shift: { startsAt: { gt: now } } } } } },
    },
  });

  const at = zonedParts(shift.startsAt, org(req).timezone);
  const part = dayPartOf(at.hour);
  const candidates: CoverCandidate[] = members.map((m) => {
    const av = availabilitySchema.safeParse(m.availability ?? {});
    return {
      volunteerId: m.id,
      name: m.user.name,
      email: m.user.email,
      phone: m.phone,
      available: av.success && hasAvailability(av.data, at.weekday, part),
      inDepartment: !!shift.event.departmentId && m.departments.some((d) => d.id === shift.event.departmentId),
      upcomingShifts: m._count.assignments,
    };
  });
  candidates.sort(
    (a, b) =>
      Number(b.available) - Number(a.available) ||
      Number(b.inDepartment) - Number(a.inDepartment) ||
      a.upcomingShifts - b.upcomingShifts ||
      a.name.localeCompare(b.name),
  );
  res.json(candidates.slice(0, 25));
});

// ---------- assignments (coordinators) ----------

export const assignmentsRouter = Router();
assignmentsRouter.use(requireAuth, requireOrg, requirePermission('shifts:manage'));

assignmentsRouter.post('/:id/cancel', async (req, res) => {
  const { reason } = cancelInput.parse(req.body ?? {});
  const organizationId = orgId(req);
  const a = await prisma.shiftAssignment.findFirst({
    where: { id: param(req), organizationId },
    include: { membership: { include: { user: true } }, shift: { include: { event: { include: eventInclude } } } },
  });
  if (!a) throw new HttpError(404, 'Place not found');
  if (a.status === 'CANCELLED') throw new HttpError(409, 'This place has already been cancelled');

  const result = await prisma.$transaction((tx) => cancelAssignment(tx, a, a.shift, { byUserId: req.auth!.user.id, reason: reason ?? null, byVolunteer: false }));
  if (a.shift.startsAt > new Date()) await scheduleEmails.removed(a.membership.user, org(req), a.shift.event, a.shift, reason ?? null);
  await notifyAfterCancel(org(req), a.shift.event, a.shift, result, null);
  res.json(await loadStaffShift(organizationId, a.shiftId));
});

// ---------- my shifts (any member) ----------

export const meRouter = Router();
meRouter.use(requireAuth, requireOrg, requirePermission('self:manage'));

const myMembership = (req: Request): Membership => req.auth!.membership!;

meRouter.get('/open-shifts', async (req, res) => {
  const organizationId = orgId(req);
  const now = new Date();
  const events = await prisma.event.findMany({
    where: { organizationId, status: 'PUBLISHED', shifts: { some: { startsAt: { gt: now } } } },
    include: {
      ...eventInclude,
      shifts: {
        where: { startsAt: { gt: now } },
        include: { assignments: { where: { membershipId: myMembership(req).id, status: { in: [...ACTIVE] } } } },
        orderBy: [{ startsAt: 'asc' }, { title: 'asc' }],
      },
    },
  });
  const counts = await shiftCounts(events.flatMap((e) => e.shifts.map((s) => s.id)));
  const tz = org(req).timezone;

  const out: OpenEvent[] = [];
  for (const e of events) {
    const shifts = [];
    for (const s of e.shifts) {
      const mine = s.assignments[0];
      shifts.push({
        ...toShiftCore(s, tz, counts.get(s.id)!),
        myStatus: (mine?.status as 'CONFIRMED' | 'WAITLISTED' | undefined) ?? null,
        myWaitlistPosition: mine ? await waitlistPosition(prisma, mine) : null,
      });
    }
    out.push({ ...eventCore(e, e.shifts, tz), shifts });
  }
  out.sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));
  res.json(out);
});

meRouter.get('/shifts', async (req, res) => {
  const now = new Date();
  const mine = await prisma.shiftAssignment.findMany({
    where: { membershipId: myMembership(req).id, status: { in: [...ACTIVE] }, shift: { endsAt: { gt: now }, event: { status: { not: 'CANCELLED' } } } },
    include: { shift: { include: { event: { include: eventInclude } } } },
    orderBy: { shift: { startsAt: 'asc' } },
  });
  const counts = await shiftCounts(mine.map((a) => a.shiftId));
  const tz = org(req).timezone;
  const out: MyShift[] = [];
  for (const a of mine) {
    out.push({
      assignmentId: a.id,
      status: a.status as 'CONFIRMED' | 'WAITLISTED',
      waitlistPosition: await waitlistPosition(prisma, a),
      shift: toShiftCore(a.shift, tz, counts.get(a.shiftId)!),
      event: { id: a.shift.event.id, title: a.shift.event.title, location: eventCore(a.shift.event, [], tz).location },
      timezone: tz,
    });
  }
  res.json(out);
});

async function openShiftFor(req: Request): Promise<Shift & { event: Awaited<ReturnType<typeof findShift>>['event'] }> {
  const shift = await findShift(orgId(req), param(req, 'shiftId'));
  if (shift.event.status !== 'PUBLISHED') throw new HttpError(404, 'Shift not found');
  return shift;
}

meRouter.post('/shifts/:shiftId/signup', async (req, res) => {
  const shift = await openShiftFor(req);
  if (shift.startsAt <= new Date()) throw new HttpError(409, 'This shift has already started');
  const member = myMembership(req);
  if (!PLACEABLE.includes(member.status)) throw new HttpError(403, 'Your volunteer record is inactive. Contact the organisation to reactivate it.');

  const placed = await prisma.$transaction((tx) => placeOnShift(tx, shift, member.id, 'SELF', { self: true, name: req.auth!.user.name }));
  const position = await waitlistPosition(prisma, placed);
  const status = placed.status as 'CONFIRMED' | 'WAITLISTED';
  await scheduleEmails.placed(req.auth!.user, org(req), shift.event, shift, status, position, false);
  res.status(201).json({ status, waitlistPosition: position });
});

meRouter.post('/shifts/:shiftId/cancel', async (req, res) => {
  const { reason } = cancelInput.parse(req.body ?? {});
  const shift = await openShiftFor(req);
  if (shift.startsAt <= new Date()) throw new HttpError(409, 'This shift has already started. Contact the organiser instead.');
  const a = await prisma.shiftAssignment.findUnique({
    where: { shiftId_membershipId: { shiftId: shift.id, membershipId: myMembership(req).id } },
  });
  if (!a || a.status === 'CANCELLED') throw new HttpError(404, 'You aren’t on this shift');

  const result = await prisma.$transaction((tx) => cancelAssignment(tx, a, shift, { byUserId: req.auth!.user.id, reason: reason ?? null, byVolunteer: true }));
  await scheduleEmails.cancelledBySelf(req.auth!.user, org(req), shift.event, shift, result.wasConfirmed);
  await notifyAfterCancel(org(req), shift.event, shift, result, { name: req.auth!.user.name, late: result.wasConfirmed && isLateCancel(shift.startsAt) });
  res.json({ ok: true });
});
