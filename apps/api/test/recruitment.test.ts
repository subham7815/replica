import { validateAnswers, type Question } from '@newreplica/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { authHeaders, createUser, resetDb } from './helpers';

const app = createApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const QUESTIONS: Question[] = [
  { id: 'why', label: 'Why do you want to help?', type: 'textarea', required: true },
  { id: 'shift', label: 'Preferred shift', type: 'select', required: false, options: ['Morning', 'Afternoon'] },
  { id: 'dbs', label: 'Do you have a DBS check?', type: 'yesno', required: true },
];

async function setup(overrides: Record<string, unknown> = {}) {
  const coord = await createUser('COORDINATOR');
  const h = await authHeaders(coord.id);
  const dept = await prisma.department.create({ data: { organizationId: coord.organizationId!, name: 'Warehouse' } });
  const res = await request(app)
    .post('/opportunities')
    .set(h)
    .send({
      title: 'Warehouse helper',
      summary: 'Sort and pack food parcels on Saturday mornings.',
      departmentId: dept.id,
      status: 'PUBLISHED',
      questions: QUESTIONS,
      ...overrides,
    });
  expect(res.status).toBe(201);
  return { coord, h, dept, opp: res.body };
}

const goodApplication = {
  name: 'Priya Shah',
  email: 'Priya@Example.com',
  phone: '07700 900123',
  answers: { why: 'I live nearby', shift: 'Morning', dbs: true },
  consent: true,
};

describe('opportunities (coordinators)', () => {
  it('creates, edits, lists with counts and deletes', async () => {
    const { h, opp } = await setup();
    expect(opp).toMatchObject({ status: 'PUBLISHED', signupMode: 'APPROVAL', visibility: 'PUBLIC', pendingCount: 0 });
    expect(opp.publishedAt).toBeTypeOf('string');
    expect(opp.questions).toHaveLength(3);

    const edited = await request(app).patch(`/opportunities/${opp.id}`).set(h).send({ status: 'CLOSED', commitment: 'Weekly' });
    expect(edited.body).toMatchObject({ status: 'CLOSED', commitment: 'Weekly' });

    expect((await request(app).get('/opportunities').set(h)).body).toHaveLength(1);
    expect((await request(app).delete(`/opportunities/${opp.id}`).set(h)).status).toBe(200);
    expect((await request(app).get('/opportunities').set(h)).body).toHaveLength(0);
  });

  it('validates questions and refs', async () => {
    const coord = await createUser('COORDINATOR');
    const h = await authHeaders(coord.id);
    const base = { title: 'Helper', summary: 'Help us out on weekends please.' };
    const badSelect = await request(app)
      .post('/opportunities')
      .set(h)
      .send({ ...base, questions: [{ id: 'a', label: 'Pick', type: 'select', required: true, options: ['Only one'] }] });
    expect(badSelect.status).toBe(400);

    const other = await createUser('ORG_ADMIN');
    const foreignDept = await prisma.department.create({ data: { organizationId: other.organizationId!, name: 'X' } });
    expect((await request(app).post('/opportunities').set(h).send({ ...base, departmentId: foreignDept.id })).status).toBe(400);
  });

  it('is isolated per organisation and limited to volunteers:manage', async () => {
    const { opp } = await setup();
    const outsider = await createUser('ORG_ADMIN');
    const oh = await authHeaders(outsider.id);
    expect((await request(app).get(`/opportunities/${opp.id}`).set(oh)).status).toBe(404);
    expect((await request(app).patch(`/opportunities/${opp.id}`).set(oh).send({ title: 'Hacked' })).status).toBe(404);
    expect((await request(app).delete(`/opportunities/${opp.id}`).set(oh)).status).toBe(404);

    const auditor = await createUser('AUDITOR');
    expect((await request(app).get('/opportunities').set(await authHeaders(auditor.id))).status).toBe(403);
  });
});

describe('public discovery', () => {
  it('lists only published public roles; unlisted are reachable by link; drafts are hidden', async () => {
    const { h, opp } = await setup();
    const unlisted = await request(app).post('/opportunities').set(h).send({ title: 'Secret role', summary: 'Only for people with the link.', status: 'PUBLISHED', visibility: 'UNLISTED' });
    const draft = await request(app).post('/opportunities').set(h).send({ title: 'Draft role', summary: 'Not ready to publish yet.' });

    const list = await request(app).get('/public/opportunities');
    expect(list.body.items.map((o: { id: string }) => o.id)).toEqual([opp.id]);
    expect(list.body.items[0].organization).toMatchObject({ name: 'Test Org' });
    expect(list.body.items[0]).not.toHaveProperty('pendingCount');

    expect((await request(app).get(`/public/opportunities/${unlisted.body.id}`)).status).toBe(200);
    expect((await request(app).get(`/public/opportunities/${draft.body.id}`)).status).toBe(404);
    expect((await request(app).get('/public/opportunities?q=warehouse')).body.total).toBe(1);
    expect((await request(app).get('/public/opportunities?q=nothing-matches')).body.total).toBe(0);
  });

  it('shows an organisation page with its public roles', async () => {
    const { coord } = await setup();
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: coord.organizationId! } });
    const page = await request(app).get(`/public/organizations/${org.slug}`);
    expect(page.status).toBe(200);
    expect(page.body.organization).toMatchObject({ name: 'Test Org', brandColor: '#c7102c' });
    expect(page.body.opportunities).toHaveLength(1);
    expect((await request(app).get('/public/organizations/nope')).status).toBe(404);
  });
});

describe('applying and reviewing', () => {
  it('approval flow: apply → pending → approve creates a volunteer in the role’s department', async () => {
    const { h, opp, dept } = await setup();
    const applied = await request(app).post(`/public/opportunities/${opp.id}/apply`).send(goodApplication);
    expect(applied.status).toBe(201);
    expect(applied.body).toEqual({ ok: true });

    const queue = await request(app).get('/applications?status=PENDING').set(h);
    expect(queue.body.pendingTotal).toBe(1);
    const appRow = queue.body.items[0];
    expect(appRow).toMatchObject({ name: 'Priya Shah', email: 'priya@example.com', status: 'PENDING', volunteerId: null });
    expect(appRow.answers).toEqual([
      { question: 'Why do you want to help?', answer: 'I live nearby' },
      { question: 'Preferred shift', answer: 'Morning' },
      { question: 'Do you have a DBS check?', answer: 'Yes' },
    ]);

    const approved = await request(app).post(`/applications/${appRow.id}/approve`).set(h).send({ note: 'Welcome!' });
    expect(approved.body).toMatchObject({ status: 'APPROVED', reviewNote: 'Welcome!', reviewedBy: 'COORDINATOR' });
    expect(approved.body.volunteerId).toBeTypeOf('string');

    const volunteer = await request(app).get(`/volunteers/${approved.body.volunteerId}`).set(h);
    expect(volunteer.body).toMatchObject({ status: 'INVITED', phone: '07700 900123', departments: [{ id: dept.id }] });

    expect((await request(app).post(`/applications/${appRow.id}/approve`).set(h)).status).toBe(409);
    expect((await request(app).post(`/applications/${appRow.id}/reject`).set(h)).status).toBe(409);
  });

  it('open roles add the volunteer straight away', async () => {
    const { h, opp } = await setup({ signupMode: 'OPEN' });
    await request(app).post(`/public/opportunities/${opp.id}/apply`).send(goodApplication);
    const list = await request(app).get('/applications').set(h);
    expect(list.body.items[0].status).toBe('APPROVED');
    expect((await request(app).get('/volunteers').set(h)).body.total).toBe(1);
  });

  it('declines with a note and keeps the person out of the volunteer list', async () => {
    const { h, opp } = await setup();
    await request(app).post(`/public/opportunities/${opp.id}/apply`).send(goodApplication);
    const id = (await request(app).get('/applications').set(h)).body.items[0].id;
    const rejected = await request(app).post(`/applications/${id}/reject`).set(h).send({ note: 'Role is full' });
    expect(rejected.body).toMatchObject({ status: 'REJECTED', reviewNote: 'Role is full' });
    expect((await request(app).get('/volunteers').set(h)).body.total).toBe(0);
    // A decline can be reversed.
    expect((await request(app).post(`/applications/${id}/approve`).set(h)).body.status).toBe('APPROVED');
  });

  it('validates answers with the same rules as the form', async () => {
    const { opp } = await setup();
    const missing = await request(app)
      .post(`/public/opportunities/${opp.id}/apply`)
      .send({ ...goodApplication, answers: { shift: 'Evening' } });
    expect(missing.status).toBe(400);
    expect(Object.keys(missing.body.fields).sort()).toEqual(['dbs', 'shift', 'why']);

    const noConsent = await request(app).post(`/public/opportunities/${opp.id}/apply`).send({ ...goodApplication, consent: false });
    expect(noConsent.status).toBe(400);
  });

  it('gives the same answer for duplicates and existing members, without creating duplicates', async () => {
    const { h, opp, coord } = await setup();
    const first = await request(app).post(`/public/opportunities/${opp.id}/apply`).send(goodApplication);
    const again = await request(app).post(`/public/opportunities/${opp.id}/apply`).send({ ...goodApplication, name: 'Someone Else' });
    expect(again.body).toEqual(first.body);
    expect((await request(app).get('/applications').set(h)).body.total).toBe(1);
    // the applicant's name isn't overwritten by a later submission
    expect((await prisma.user.findUniqueOrThrow({ where: { email: 'priya@example.com' } })).name).toBe('Priya Shah');

    const staff = await prisma.user.findUniqueOrThrow({ where: { id: coord.id } });
    const asStaff = await request(app).post(`/public/opportunities/${opp.id}/apply`).send({ ...goodApplication, email: staff.email });
    expect(asStaff.body).toEqual({ ok: true });
  });

  it('ignores suspended members and refuses closed roles', async () => {
    const { h, opp, coord } = await setup();
    const suspended = await createUser('VOLUNTEER', { orgId: coord.organizationId!, status: 'SUSPENDED', email: 'banned@example.com' });
    await request(app).post(`/public/opportunities/${opp.id}/apply`).send({ ...goodApplication, email: 'banned@example.com' });
    expect((await request(app).get('/applications').set(h)).body.total).toBe(0);
    expect(suspended.id).toBeTypeOf('string');

    await request(app).patch(`/opportunities/${opp.id}`).set(h).send({ status: 'CLOSED' });
    expect((await request(app).post(`/public/opportunities/${opp.id}/apply`).send(goodApplication)).status).toBe(404);
  });

  it('keeps review queues separate per organisation', async () => {
    const { opp } = await setup();
    await request(app).post(`/public/opportunities/${opp.id}/apply`).send(goodApplication);
    const outsider = await createUser('COORDINATOR');
    const oh = await authHeaders(outsider.id);
    expect((await request(app).get('/applications').set(oh)).body.total).toBe(0);
    const id = (await prisma.application.findFirstOrThrow()).id;
    expect((await request(app).get(`/applications/${id}`).set(oh)).status).toBe(404);
    expect((await request(app).post(`/applications/${id}/approve`).set(oh)).status).toBe(404);
  });
});

describe('validateAnswers', () => {
  it('checks required fields, choices and yes/no', () => {
    expect(validateAnswers(QUESTIONS, { why: 'x', dbs: false })).toEqual({});
    expect(validateAnswers(QUESTIONS, { why: '   ', dbs: 'yes' as unknown as boolean })).toEqual({
      why: 'This question is required',
      dbs: 'Choose yes or no',
    });
    expect(validateAnswers(QUESTIONS, { why: 'x', dbs: true, shift: 'Night' })).toEqual({ shift: 'Choose one of the options' });
  });
});
