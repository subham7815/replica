import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { parseCsv, toCsv } from '../src/lib/csv';
import { authHeaders, createUser, resetDb } from './helpers';

const app = createApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function coordinator() {
  const c = await createUser('COORDINATOR');
  return { ...c, h: await authHeaders(c.id) };
}

describe('volunteer database', () => {
  it('creates, reads, updates and deletes a volunteer', async () => {
    const { h, organizationId } = await coordinator();
    const dept = await prisma.department.create({ data: { organizationId: organizationId!, name: 'Warehouse' } });

    const created = await request(app)
      .post('/volunteers')
      .set(h)
      .send({
        name: 'Priya Shah',
        email: 'Priya@Example.com',
        phone: '07700 900123',
        skills: ['First aid', 'First aid', ' Driving '],
        availability: { sat: ['morning'], tue: ['evening'] },
        departmentIds: [dept.id],
      });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      email: 'priya@example.com',
      status: 'INVITED',
      skills: ['First aid', 'Driving'],
      availability: { sat: ['morning'], tue: ['evening'] },
      departments: [{ id: dept.id, name: 'Warehouse' }],
      identityEditable: true,
    });

    const updated = await request(app)
      .patch(`/volunteers/${created.body.id}`)
      .set(h)
      .send({ name: 'Priya S.', status: 'ACTIVE', departmentIds: [], notes: 'Prefers Saturdays' });
    expect(updated.body).toMatchObject({ name: 'Priya S.', status: 'ACTIVE', departments: [], notes: 'Prefers Saturdays' });

    expect((await request(app).get(`/volunteers/${created.body.id}`).set(h)).status).toBe(200);
    expect((await request(app).delete(`/volunteers/${created.body.id}`).set(h)).status).toBe(200);
    expect((await request(app).get(`/volunteers/${created.body.id}`).set(h)).status).toBe(404);
    // the invited-only account is cleaned up
    expect(await prisma.user.findUnique({ where: { email: 'priya@example.com' } })).toBeNull();
  });

  it('searches, filters and paginates', async () => {
    const { h, organizationId } = await coordinator();
    const dept = await prisma.department.create({ data: { organizationId: organizationId!, name: 'Desk' } });
    for (const [name, status] of [
      ['Alice Apple', 'ACTIVE'],
      ['Bob Brown', 'INVITED'],
      ['Carol Cherry', 'ACTIVE'],
    ] as const) {
      await request(app)
        .post('/volunteers')
        .set(h)
        .send({ name, email: `${name.split(' ')[0]!.toLowerCase()}@example.com`, status, departmentIds: name === 'Bob Brown' ? [dept.id] : [] });
    }

    const all = await request(app).get('/volunteers').set(h);
    expect(all.body.total).toBe(3);
    expect(all.body.items.map((v: { name: string }) => v.name)).toEqual(['Alice Apple', 'Bob Brown', 'Carol Cherry']);

    expect((await request(app).get('/volunteers?q=cher').set(h)).body.total).toBe(1);
    expect((await request(app).get('/volunteers?q=BOB@EX').set(h)).body.total).toBe(1);
    expect((await request(app).get('/volunteers?status=ACTIVE').set(h)).body.total).toBe(2);
    expect((await request(app).get(`/volunteers?departmentId=${dept.id}`).set(h)).body.items[0].name).toBe('Bob Brown');

    const page2 = await request(app).get('/volunteers?page=2&pageSize=2').set(h);
    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.total).toBe(3);
  });

  it('never shows staff in the volunteer list', async () => {
    const { h, organizationId } = await coordinator();
    await createUser('AUDITOR', { orgId: organizationId! });
    expect((await request(app).get('/volunteers').set(h)).body.total).toBe(0);
  });

  it('isolates organisations', async () => {
    const mine = await coordinator();
    const theirs = await coordinator();
    const v = await request(app).post('/volunteers').set(theirs.h).send({ name: 'Theirs', email: 't@example.com' });

    expect((await request(app).get('/volunteers').set(mine.h)).body.total).toBe(0);
    expect((await request(app).get(`/volunteers/${v.body.id}`).set(mine.h)).status).toBe(404);
    expect((await request(app).patch(`/volunteers/${v.body.id}`).set(mine.h).send({ notes: 'x' })).status).toBe(404);
    expect((await request(app).delete(`/volunteers/${v.body.id}`).set(mine.h)).status).toBe(404);

    const otherDept = await prisma.department.create({ data: { organizationId: theirs.organizationId!, name: 'X' } });
    const sneaky = await request(app).post('/volunteers').set(mine.h).send({ name: 'Me', email: 'me@example.com', departmentIds: [otherDept.id] });
    expect(sneaky.status).toBe(400);
  });

  it('the same person can volunteer for two organisations with separate details', async () => {
    const a = await coordinator();
    const b = await coordinator();
    const inA = await request(app).post('/volunteers').set(a.h).send({ name: 'Sam', email: 'sam@example.com', phone: '111' });
    const inB = await request(app).post('/volunteers').set(b.h).send({ name: 'Sam', email: 'sam@example.com', phone: '222' });
    expect(inB.status).toBe(201);
    expect(inB.body.userId).toBe(inA.body.userId);
    expect(inB.body.identityEditable).toBe(false);

    // shared identity can no longer be changed by either organisation
    const rename = await request(app).patch(`/volunteers/${inA.body.id}`).set(a.h).send({ name: 'Renamed' });
    expect(rename.status).toBe(409);
    expect((await request(app).get(`/volunteers/${inA.body.id}`).set(a.h)).body.phone).toBe('111');
  });

  it('locks name and email once the volunteer has signed in', async () => {
    const { h, organizationId } = await coordinator();
    const v = await createUser('VOLUNTEER', { orgId: organizationId!, name: 'Val' });
    await prisma.user.update({ where: { id: v.id }, data: { lastLoginAt: new Date() } });
    expect((await request(app).patch(`/volunteers/${v.membershipId}`).set(h).send({ name: 'Changed' })).status).toBe(409);
    expect((await request(app).patch(`/volunteers/${v.membershipId}`).set(h).send({ name: 'Val', notes: 'fine' })).status).toBe(200);
  });

  it('is limited to roles with volunteers:manage', async () => {
    for (const role of ['VOLUNTEER', 'AUDITOR', 'CHECKIN_OPERATOR'] as const) {
      const u = await createUser(role);
      expect((await request(app).get('/volunteers').set(await authHeaders(u.id))).status).toBe(403);
    }
  });
});

describe('CSV import and export', () => {
  const csv = [
    'Full Name,Email,Phone,Departments,Skills,Notes',
    'Priya Shah,priya@example.com,07700 900123,Warehouse;Nowhere,First aid;Driving,"Prefers Saturdays, mornings"',
    'Tom,tom@example.com,,,,',
    'No Email,,,,,',
    'Dup,PRIYA@example.com,,,,',
    'Existing,existing@example.com,,,,',
  ].join('\n');

  it('previews, then imports, reporting each row', async () => {
    const { h, organizationId } = await coordinator();
    await prisma.department.create({ data: { organizationId: organizationId!, name: 'Warehouse' } });
    await request(app).post('/volunteers').set(h).send({ name: 'Existing', email: 'existing@example.com' });

    const preview = await request(app).post('/volunteers/import').set(h).send({ csv, dryRun: true });
    expect(preview.status).toBe(200);
    expect(preview.body.created).toBe(0);
    expect(preview.body.rows.map((r: { outcome: string }) => r.outcome)).toEqual(['create', 'create', 'error', 'error', 'skip']);
    expect(preview.body.rows[0].message).toContain('Nowhere');
    expect(preview.body.rows[3].message).toContain('row 2');
    expect((await request(app).get('/volunteers').set(h)).body.total).toBe(1);

    const done = await request(app).post('/volunteers/import').set(h).send({ csv, dryRun: false });
    expect(done.body.created).toBe(2);
    const priya = (await request(app).get('/volunteers?q=priya').set(h)).body.items[0];
    expect(priya).toMatchObject({
      phone: '07700 900123',
      skills: ['First aid', 'Driving'],
      notes: 'Prefers Saturdays, mornings',
      departments: [{ name: 'Warehouse' }],
    });
  });

  it('rejects files without name/email headers', async () => {
    const { h } = await coordinator();
    const res = await request(app).post('/volunteers/import').set(h).send({ csv: 'foo,bar\n1,2' });
    expect(res.status).toBe(400);
  });

  it('exports a CSV that neutralises spreadsheet formulas', async () => {
    const { h } = await coordinator();
    await request(app).post('/volunteers').set(h).send({ name: '=HYPERLINK("http://evil")', email: 'evil@example.com', phone: '+44 7700 900123' });
    const res = await request(app).get('/volunteers/export').set(h);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const rows = parseCsv(res.text);
    expect(rows[0]).toEqual(['name', 'email', 'phone', 'status', 'departments', 'skills', 'availability', 'notes', 'joined']);
    expect(rows[1]![0]).toBe(`'=HYPERLINK("http://evil")`);
    expect(rows[1]![2]).toBe('+44 7700 900123');
  });
});

describe('csv helpers', () => {
  it('round-trips quotes, commas and newlines', () => {
    const rows = [['a,b', 'say "hi"', 'line1\nline2'], ['plain', '', 'x']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('handles a BOM and CRLF line endings', () => {
    expect(parseCsv('﻿name,email\r\nA,a@x.com\r\n')).toEqual([
      ['name', 'email'],
      ['A', 'a@x.com'],
    ]);
  });
});
