import { addDays, todayIn } from '@newreplica/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { authHeaders, createUser, resetDb } from './helpers';

const app = createApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const TZ = 'Europe/London';
const inDays = (n: number) => addDays(todayIn(TZ), n);

async function setup() {
  const coord = await createUser('COORDINATOR');
  const orgId = coord.organizationId!;
  const h = await authHeaders(coord.id);
  const res = await request(app).post('/events').set(h).send({ title: 'Saturday sorting', status: 'PUBLISHED' });
  expect(res.status).toBe(201);
  return { coord, orgId, h, event: res.body };
}

async function addShift(h: Record<string, string>, eventId: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post(`/events/${eventId}/shifts`)
    .set(h)
    .send({ title: 'Sorting', date: inDays(5), startTime: '09:00', endTime: '12:00', capacity: 2, ...overrides });
  expect(res.status).toBe(201);
  return res.body;
}

async function volunteer(orgId: string, name = 'Vol') {
  const v = await createUser('VOLUNTEER', { orgId, name });
  return { ...v, h: await authHeaders(v.id) };
}

const signup = (h: Record<string, string>, shiftId: string) => request(app).post(`/me/shifts/${shiftId}/signup`).set(h);
const cancel = (h: Record<string, string>, shiftId: string) => request(app).post(`/me/shifts/${shiftId}/cancel`).set(h).send({});

describe('events and shifts (coordinators)', () => {
  it('stores shift times in the organisation’s time zone, including overnight shifts', async () => {
    const { h, event } = await setup();
    const summer = await addShift(h, event.id, { date: '2027-07-10', startTime: '09:00', endTime: '12:30' });
    expect(summer.startsAt).toBe('2027-07-10T08:00:00.000Z'); // BST
    expect(summer).toMatchObject({ date: '2027-07-10', startTime: '09:00', endTime: '12:30', spotsLeft: 2 });

    const winter = await addShift(h, event.id, { date: '2027-01-10', startTime: '22:00', endTime: '02:00' });
    expect(winter.startsAt).toBe('2027-01-10T22:00:00.000Z'); // GMT
    expect(winter.endsAt).toBe('2027-01-11T02:00:00.000Z');

    const detail = await request(app).get(`/events/${event.id}`).set(h);
    expect(detail.body).toMatchObject({ shiftCount: 2, capacity: 4, startsAt: winter.startsAt, endsAt: summer.endsAt });
  });

  it('validates input and scopes by organisation and permission', async () => {
    const { h, orgId, event } = await setup();
    expect((await request(app).post(`/events/${event.id}/shifts`).set(h).send({ title: 'X', date: '2027-13-01', startTime: '09:00', endTime: '10:00', capacity: 1 })).status).toBe(400);
    expect((await request(app).post(`/events/${event.id}/shifts`).set(h).send({ title: 'X', date: '2027-01-01', startTime: '09:00', endTime: '09:00', capacity: 1 })).status).toBe(400);

    const outsider = await createUser('ORG_ADMIN');
    const oh = await authHeaders(outsider.id);
    expect((await request(app).get(`/events/${event.id}`).set(oh)).status).toBe(404);
    expect((await request(app).post(`/events/${event.id}/shifts`).set(oh).send({ title: 'X', date: inDays(1), startTime: '09:00', endTime: '10:00', capacity: 1 })).status).toBe(404);

    const v = await volunteer(orgId);
    expect((await request(app).get('/events').set(v.h)).status).toBe(403);
    expect((await request(app).post('/events').set(v.h).send({ title: 'Mine' })).status).toBe(403);
    const auditor = await createUser('AUDITOR', { orgId });
    expect((await request(app).get(`/events/${event.id}`).set(await authHeaders(auditor.id))).status).toBe(403);
  });

  it('lists upcoming and past events', async () => {
    const { h, event } = await setup();
    await addShift(h, event.id);
    const old = (await request(app).post('/events').set(h).send({ title: 'Last year' })).body;
    await addShift(h, old.id, { date: '2025-01-04' });
    const empty = (await request(app).post('/events').set(h).send({ title: 'Being planned' })).body;

    const upcoming = (await request(app).get('/events').set(h)).body.map((e: { id: string }) => e.id);
    expect(upcoming).toEqual([empty.id, event.id]);
    const past = (await request(app).get('/events?scope=past').set(h)).body.map((e: { id: string }) => e.id);
    expect(past).toEqual([old.id]);
  });
});

describe('sign-up, waitlist and cover', () => {
  it('confirms until full, then waitlists in order and promotes on cancellation', async () => {
    const { h, orgId, event } = await setup();
    const shift = await addShift(h, event.id, { capacity: 1 });
    const [a, b, c] = [await volunteer(orgId, 'A'), await volunteer(orgId, 'B'), await volunteer(orgId, 'C')];

    expect((await signup(a.h, shift.id)).body).toEqual({ status: 'CONFIRMED', waitlistPosition: null });
    expect((await signup(b.h, shift.id)).body).toEqual({ status: 'WAITLISTED', waitlistPosition: 1 });
    expect((await signup(c.h, shift.id)).body).toEqual({ status: 'WAITLISTED', waitlistPosition: 2 });
    expect((await signup(a.h, shift.id)).status).toBe(409);

    expect((await cancel(a.h, shift.id)).status).toBe(200);
    const mine = (await request(app).get('/me/shifts').set(b.h)).body;
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ status: 'CONFIRMED' });
    const cMine = (await request(app).get('/me/shifts').set(c.h)).body;
    expect(cMine[0]).toMatchObject({ status: 'WAITLISTED', waitlistPosition: 1 });

    const roster = (await request(app).get(`/events/${event.id}`).set(h)).body.shifts[0].roster;
    expect(roster.map((r: { name: string; status: string }) => `${r.name}:${r.status}`)).toEqual(['B:CONFIRMED', 'C:WAITLISTED', 'A:CANCELLED']);
    expect(roster[0].promotedAt).toBeTypeOf('string');

    // Re-joining after cancelling goes to the back of the queue.
    expect((await signup(a.h, shift.id)).body).toEqual({ status: 'WAITLISTED', waitlistPosition: 2 });
  });

  it('refuses when full and the waitlist is off', async () => {
    const { h, orgId, event } = await setup();
    const shift = await addShift(h, event.id, { capacity: 1, waitlistEnabled: false });
    await signup((await volunteer(orgId)).h, shift.id);
    const res = await signup((await volunteer(orgId)).h, shift.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('This shift is full');
  });

  it('never overfills a shift when people sign up at the same moment', async () => {
    const { h, orgId, event } = await setup();
    const shift = await addShift(h, event.id, { capacity: 2 });
    const people = await Promise.all(Array.from({ length: 6 }, (_, i) => volunteer(orgId, `P${i}`)));
    const results = await Promise.all(people.map((p) => signup(p.h, shift.id)));
    const statuses = results.map((r) => r.body.status);
    expect(statuses.filter((s) => s === 'CONFIRMED')).toHaveLength(2);
    expect(statuses.filter((s) => s === 'WAITLISTED')).toHaveLength(4);
    const positions = results.map((r) => r.body.waitlistPosition).filter(Boolean).sort();
    expect(positions).toEqual([1, 2, 3, 4]);
  });

  it('blocks double-booking overlapping shifts', async () => {
    const { h, orgId, event } = await setup();
    const morning = await addShift(h, event.id, { title: 'Sorting', startTime: '09:00', endTime: '12:00' });
    const overlap = await addShift(h, event.id, { title: 'Packing', startTime: '11:00', endTime: '13:00' });
    const after = await addShift(h, event.id, { title: 'Clean-up', startTime: '12:00', endTime: '13:00' });
    const v = await volunteer(orgId);
    await signup(v.h, morning.id);
    const clash = await signup(v.h, overlap.id);
    expect(clash.status).toBe(409);
    expect(clash.body.error).toContain('Saturday sorting: Sorting');
    expect((await signup(v.h, after.id)).status).toBe(201);
  });

  it('only offers published, future shifts and flags late cancellations', async () => {
    const { h, orgId, event } = await setup();
    const future = await addShift(h, event.id, { date: inDays(3) });
    const past = await addShift(h, event.id, { date: '2025-01-04' });
    const draft = (await request(app).post('/events').set(h).send({ title: 'Draft' })).body;
    const draftShift = await addShift(h, draft.id);
    const v = await volunteer(orgId);

    const open = (await request(app).get('/me/open-shifts').set(v.h)).body;
    expect(open.map((e: { id: string }) => e.id)).toEqual([event.id]);
    expect(open[0].shifts.map((s: { id: string }) => s.id)).toEqual([future.id]);
    expect((await signup(v.h, past.id)).status).toBe(409);
    expect((await signup(v.h, draftShift.id)).status).toBe(404);

    // Late cancellation: a shift starting within 24 hours.
    const tomorrow = await addShift(h, event.id, { date: inDays(1), startTime: '00:30', endTime: '01:00' });
    await prisma.shift.update({ where: { id: tomorrow.id }, data: { startsAt: new Date(Date.now() + 3600_000), endsAt: new Date(Date.now() + 7200_000) } });
    await signup(v.h, tomorrow.id);
    await cancel(v.h, tomorrow.id);
    const row = await prisma.shiftAssignment.findFirstOrThrow({ where: { shiftId: tomorrow.id } });
    expect(row).toMatchObject({ status: 'CANCELLED', lateCancel: true, cancelledById: v.id });
  });

  it('lets coordinators assign, remove and resize, promoting from the waitlist', async () => {
    const { h, orgId, event } = await setup();
    const shift = await addShift(h, event.id, { capacity: 1 });
    const [a, b] = [await volunteer(orgId, 'A'), await volunteer(orgId, 'B')];

    let s = (await request(app).post(`/shifts/${shift.id}/assignments`).set(h).send({ volunteerId: a.membershipId })).body;
    expect(s.roster[0]).toMatchObject({ name: 'A', status: 'CONFIRMED', source: 'STAFF' });
    s = (await request(app).post(`/shifts/${shift.id}/assignments`).set(h).send({ volunteerId: b.membershipId })).body;
    expect(s.roster[1]).toMatchObject({ name: 'B', status: 'WAITLISTED', waitlistPosition: 1 });

    // Can't shrink below the confirmed count; growing promotes the waitlist.
    const base = { title: 'Sorting', date: s.date, startTime: s.startTime, endTime: s.endTime, waitlistEnabled: true };
    s = (await request(app).patch(`/shifts/${shift.id}`).set(h).send({ ...base, capacity: 2 })).body;
    expect(s).toMatchObject({ confirmedCount: 2, waitlistCount: 0 });
    expect((await request(app).patch(`/shifts/${shift.id}`).set(h).send({ ...base, capacity: 1 })).status).toBe(409);

    const removed = await request(app).post(`/assignments/${s.roster[0].id}/cancel`).set(h).send({ reason: 'Double-booked' });
    expect(removed.body.roster.find((r: { name: string }) => r.name === 'A')).toMatchObject({ status: 'CANCELLED', cancelReason: 'Double-booked', lateCancel: false });

    const suspended = await createUser('VOLUNTEER', { orgId, status: 'SUSPENDED' });
    expect((await request(app).post(`/shifts/${shift.id}/assignments`).set(h).send({ volunteerId: suspended.membershipId })).status).toBe(409);
    const foreign = await createUser('VOLUNTEER');
    expect((await request(app).post(`/shifts/${shift.id}/assignments`).set(h).send({ volunteerId: foreign.membershipId })).status).toBe(404);
  });

  it('ranks cover candidates by availability and department, excluding clashes', async () => {
    const { h, orgId } = await setup();
    const dept = await prisma.department.create({ data: { organizationId: orgId, name: 'Warehouse' } });
    const event = (await request(app).post('/events').set(h).send({ title: 'Packing', status: 'PUBLISHED', departmentId: dept.id })).body;
    // 2027-07-10 is a Saturday.
    const shift = await addShift(h, event.id, { date: '2027-07-10', startTime: '09:00', endTime: '12:00' });
    const other = await addShift(h, event.id, { title: 'Other', date: '2027-07-10', startTime: '10:00', endTime: '11:00' });

    const free = await volunteer(orgId, 'Free on Saturdays');
    await prisma.membership.update({ where: { id: free.membershipId! }, data: { availability: { sat: ['morning'] } } });
    const inDept = await volunteer(orgId, 'Warehouse regular');
    await prisma.membership.update({ where: { id: inDept.membershipId! }, data: { departments: { connect: { id: dept.id } } } });
    await volunteer(orgId, 'Anyone');
    const busy = await volunteer(orgId, 'Busy');
    await signup(busy.h, other.id);

    const res = await request(app).get(`/shifts/${shift.id}/cover-candidates`).set(h);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual(['Free on Saturdays', 'Warehouse regular', 'Anyone']);
    expect(res.body[0]).toMatchObject({ available: true, inDepartment: false });
  });
});

describe('cancelling and deleting', () => {
  it('cancelling an event cancels every place and freezes it', async () => {
    const { h, orgId, event } = await setup();
    const shift = await addShift(h, event.id);
    const v = await volunteer(orgId);
    await signup(v.h, shift.id);

    const res = await request(app).post(`/events/${event.id}/cancel`).set(h).send({ reason: 'Venue flooded' });
    expect(res.body).toMatchObject({ status: 'CANCELLED', confirmedCount: 0, openSpots: 0 });
    expect(res.body.shifts[0].roster[0]).toMatchObject({ status: 'CANCELLED', cancelReason: 'Venue flooded' });
    expect((await request(app).get('/me/shifts').set(v.h)).body).toEqual([]);
    expect((await request(app).patch(`/events/${event.id}`).set(h).send({ title: 'Again' })).status).toBe(409);
    expect((await request(app).post(`/events/${event.id}/shifts`).set(h).send({ title: 'X', date: inDays(2), startTime: '09:00', endTime: '10:00', capacity: 1 })).status).toBe(409);
  });

  it('won’t move a published event with sign-ups back to draft', async () => {
    const { h, orgId, event } = await setup();
    const shift = await addShift(h, event.id);
    await signup((await volunteer(orgId)).h, shift.id);
    expect((await request(app).patch(`/events/${event.id}`).set(h).send({ status: 'DRAFT' })).status).toBe(409);
  });

  it('removing a volunteer frees their places for the waitlist', async () => {
    const { h, orgId, event } = await setup();
    const shift = await addShift(h, event.id, { capacity: 1 });
    const [a, b] = [await volunteer(orgId, 'A'), await volunteer(orgId, 'B')];
    await signup(a.h, shift.id);
    await signup(b.h, shift.id);
    expect((await request(app).delete(`/volunteers/${a.membershipId}`).set(h)).status).toBe(200);
    expect((await request(app).get('/me/shifts').set(b.h)).body[0]).toMatchObject({ status: 'CONFIRMED' });
  });

  it('deletes shifts and events', async () => {
    const { h, orgId, event } = await setup();
    const shift = await addShift(h, event.id);
    await signup((await volunteer(orgId)).h, shift.id);
    expect((await request(app).delete(`/shifts/${shift.id}`).set(h)).status).toBe(200);
    expect((await request(app).get(`/events/${event.id}`).set(h)).body.shifts).toEqual([]);
    expect((await request(app).delete(`/events/${event.id}`).set(h)).status).toBe(200);
    expect((await request(app).get(`/events/${event.id}`).set(h)).status).toBe(404);
  });
});
