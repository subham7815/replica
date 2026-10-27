import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { authHeaders, createOrg, createUser, resetDb } from './helpers';

const app = createApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('organisation profile', () => {
  it('admins can update the profile and branding; empty fields become null', async () => {
    const admin = await createUser('ORG_ADMIN');
    const res = await request(app)
      .patch('/organization')
      .set(await authHeaders(admin.id))
      .send({ name: 'Riverside', website: 'https://riverside.example', brandColor: '#123abc', phone: '', timezone: 'Europe/Paris' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Riverside', website: 'https://riverside.example', brandColor: '#123abc', phone: null, timezone: 'Europe/Paris' });
  });

  it('rejects bad values', async () => {
    const admin = await createUser('ORG_ADMIN');
    const h = await authHeaders(admin.id);
    expect((await request(app).patch('/organization').set(h).send({ brandColor: 'red' })).status).toBe(400);
    expect((await request(app).patch('/organization').set(h).send({ timezone: 'Mars/Olympus' })).status).toBe(400);
    expect((await request(app).patch('/organization').set(h).send({ website: 'javascript:alert(1)' })).status).toBe(400);
  });

  it('coordinators can read but not change settings', async () => {
    const coord = await createUser('COORDINATOR');
    const h = await authHeaders(coord.id);
    expect((await request(app).get('/organization').set(h)).status).toBe(200);
    expect((await request(app).patch('/organization').set(h).send({ name: 'Nope' })).status).toBe(403);
  });
});

describe('locations and departments', () => {
  it('CRUD within the organisation, with unique names', async () => {
    const admin = await createUser('ORG_ADMIN');
    const h = await authHeaders(admin.id);

    const created = await request(app).post('/locations').set(h).send({ name: 'Main hall', address: '1 High St' });
    expect(created.status).toBe(201);
    expect((await request(app).post('/locations').set(h).send({ name: 'Main hall' })).status).toBe(409);

    const updated = await request(app).patch(`/locations/${created.body.id}`).set(h).send({ name: 'Hall', notes: '' });
    expect(updated.body).toMatchObject({ name: 'Hall', notes: null });

    const dept = await request(app).post('/departments').set(h).send({ name: 'Warehouse' });
    expect(dept.body).toMatchObject({ name: 'Warehouse', memberCount: 0 });
    expect((await request(app).get('/departments').set(h)).body).toHaveLength(1);

    expect((await request(app).delete(`/locations/${created.body.id}`).set(h)).status).toBe(200);
    expect((await request(app).get('/locations').set(h)).body).toEqual([]);
  });

  it('cannot read, edit or delete another organisation’s records', async () => {
    const mine = await createUser('ORG_ADMIN');
    const theirs = await createUser('ORG_ADMIN');
    const loc = await prisma.location.create({ data: { organizationId: theirs.organizationId!, name: 'Secret' } });
    const dept = await prisma.department.create({ data: { organizationId: theirs.organizationId!, name: 'Secret' } });
    const h = await authHeaders(mine.id);

    expect((await request(app).get('/locations').set(h)).body).toEqual([]);
    expect((await request(app).patch(`/locations/${loc.id}`).set(h).send({ name: 'Hacked' })).status).toBe(404);
    expect((await request(app).delete(`/locations/${loc.id}`).set(h)).status).toBe(404);
    expect((await request(app).delete(`/departments/${dept.id}`).set(h)).status).toBe(404);
    expect((await prisma.location.findUniqueOrThrow({ where: { id: loc.id } })).name).toBe('Secret');
  });

  it('super-admins have no default access', async () => {
    await createOrg();
    const sa = await createUser('PLATFORM_SUPER_ADMIN');
    expect((await request(app).get('/locations').set(await authHeaders(sa.id))).status).toBe(403);
  });
});

describe('team', () => {
  it('invites staff, changes roles, and protects the last admin', async () => {
    const admin = await createUser('ORG_ADMIN');
    const h = await authHeaders(admin.id);

    const invited = await request(app).post('/team').set(h).send({ name: 'Cara', email: 'cara@example.com', role: 'COORDINATOR' });
    expect(invited.status).toBe(201);
    expect(invited.body).toMatchObject({ role: 'COORDINATOR', status: 'INVITED', isYou: false });

    const dup = await request(app).post('/team').set(h).send({ name: 'Cara', email: 'cara@example.com', role: 'AUDITOR' });
    expect(dup.status).toBe(409);

    const promoted = await request(app).patch(`/team/${invited.body.id}`).set(h).send({ role: 'ORG_ADMIN' });
    expect(promoted.body.role).toBe('ORG_ADMIN');

    // can't change yourself
    expect((await request(app).patch(`/team/${admin.membershipId}`).set(h).send({ role: 'AUDITOR' })).status).toBe(409);
    expect((await request(app).delete(`/team/${admin.membershipId}`).set(h)).status).toBe(409);

    const list = await request(app).get('/team').set(h);
    expect(list.body.map((m: { email: string }) => m.email)).toContain('cara@example.com');
  });

  it('will not leave an organisation without an active admin', async () => {
    const org = await createOrg();
    const active = await createUser('ORG_ADMIN', { orgId: org.id });
    // An admin who hasn't accepted their invite yet can still act, but must not remove the only active admin.
    const invited = await createUser('ORG_ADMIN', { orgId: org.id, status: 'INVITED' });
    const asInvited = await authHeaders(invited.id);

    expect((await request(app).patch(`/team/${active.membershipId}`).set(asInvited).send({ role: 'COORDINATOR' })).status).toBe(409);
    expect((await request(app).patch(`/team/${active.membershipId}`).set(asInvited).send({ status: 'SUSPENDED' })).status).toBe(409);
    expect((await request(app).delete(`/team/${active.membershipId}`).set(asInvited)).status).toBe(409);

    // With a second active admin the same change is allowed.
    await prisma.membership.update({ where: { id: invited.membershipId! }, data: { status: 'ACTIVE' } });
    const ok = await request(app).patch(`/team/${active.membershipId}`).set(asInvited).send({ role: 'COORDINATOR' });
    expect(ok.status).toBe(200);
    expect((await request(app).get('/team').set(await authHeaders(active.id))).status).toBe(403);
  });

  it('only admins manage the team', async () => {
    const coord = await createUser('COORDINATOR');
    expect((await request(app).get('/team').set(await authHeaders(coord.id))).status).toBe(403);
  });

  it('adds an existing Replica user from another organisation without touching their other membership', async () => {
    const elsewhere = await createUser('VOLUNTEER', { email: 'multi@example.com', name: 'Real Name' });
    const admin = await createUser('ORG_ADMIN');
    const res = await request(app)
      .post('/team')
      .set(await authHeaders(admin.id))
      .send({ name: 'Typed Name', email: 'multi@example.com', role: 'CHECKIN_OPERATOR' });
    expect(res.status).toBe(201);
    const memberships = await prisma.membership.findMany({ where: { userId: elsewhere.id } });
    expect(memberships.map((m) => m.role).sort()).toEqual(['CHECKIN_OPERATOR', 'VOLUNTEER']);
  });
});
