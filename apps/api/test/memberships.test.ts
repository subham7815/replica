import { ORG_HEADER } from '@newreplica/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { authHeaders, createOrg, createUser, resetDb } from './helpers';

const app = createApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('people in more than one organisation', () => {
  it('lists every membership and acts through the one chosen in the header', async () => {
    const food = await createOrg('Food Bank');
    const club = await createOrg('Sports Club');
    const user = await createUser('VOLUNTEER', { email: 'both@example.com', orgId: food.id });
    await prisma.membership.create({ data: { userId: user.id, organizationId: club.id, role: 'COORDINATOR' } });

    const asDefault = await request(app).get('/auth/me').set(await authHeaders(user.id));
    expect(asDefault.body.user.memberships).toHaveLength(2);
    expect(asDefault.body.user.organization.id).toBe(food.id);
    expect(asDefault.body.user.role).toBe('VOLUNTEER');

    const asClub = await request(app).get('/auth/me').set(await authHeaders(user.id, club.id));
    expect(asClub.body.user.organization.id).toBe(club.id);
    expect(asClub.body.user.role).toBe('COORDINATOR');
  });

  it('refuses an organisation the person does not belong to', async () => {
    const other = await createOrg('Someone Else');
    const user = await createUser('ORG_ADMIN');
    const res = await request(app).get('/organization').set(await authHeaders(user.id, other.id));
    expect(res.status).toBe(403);
  });

  it('skips a suspended membership but keeps the others usable', async () => {
    const a = await createOrg('A');
    const b = await createOrg('B');
    const user = await createUser('VOLUNTEER', { orgId: a.id, status: 'SUSPENDED' });
    await prisma.membership.create({ data: { userId: user.id, organizationId: b.id, role: 'VOLUNTEER' } });

    const me = await request(app).get('/auth/me').set(await authHeaders(user.id));
    expect(me.body.user.organization.id).toBe(b.id);
    expect(me.body.user.memberships).toHaveLength(1);
    const blocked = await request(app).get('/auth/me').set({ ...(await authHeaders(user.id)), [ORG_HEADER]: a.id });
    expect(blocked.status).toBe(403);
  });
});
