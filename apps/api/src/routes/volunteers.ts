import {
  WEEKDAYS,
  importVolunteersInput,
  updateVolunteerInput,
  volunteerInput,
  volunteerListQuery,
  type Availability,
  type ImportResult,
} from '@newreplica/shared';
import express, { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { parseCsv, toCsv } from '../lib/csv';
import { HttpError } from '../lib/http';
import { sendInviteEmail } from '../lib/invites';
import { cleanupOrphanUser, userForNewMembership } from '../lib/members';
import { isUniqueViolation } from '../lib/prisma-errors';
import { releaseFuturePlaces } from '../lib/schedule';
import { identityEditable, toVolunteer, volunteerInclude } from '../lib/serialize';
import { orgId, requireAuth, requireOrg, requirePermission } from '../middleware/auth';

const MAX_IMPORT_ROWS = 2000;
const MAX_EXPORT_ROWS = 10000;

export const volunteersRouter = Router();
volunteersRouter.use(requireAuth, requireOrg, requirePermission('volunteers:manage'));

function listWhere(organizationId: string, q: { q?: string; status?: string; departmentId?: string }) {
  const where: Prisma.MembershipWhereInput = { organizationId, role: 'VOLUNTEER' };
  if (q.status) where.status = q.status as Prisma.MembershipWhereInput['status'];
  if (q.departmentId) where.departments = { some: { id: q.departmentId } };
  if (q.q) {
    const term = q.q;
    where.OR = [
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      { phone: { contains: term } },
      { skills: { has: term } },
    ];
  }
  return where;
}

async function assertDepartments(organizationId: string, ids: string[] | undefined) {
  if (!ids?.length) return;
  const count = await prisma.department.count({ where: { organizationId, id: { in: ids } } });
  if (count !== new Set(ids).size) throw new HttpError(400, 'One or more departments don’t exist');
}

async function findVolunteer(organizationId: string, id: string) {
  const m = await prisma.membership.findFirst({
    where: { id, organizationId, role: 'VOLUNTEER' },
    include: volunteerInclude,
  });
  if (!m) throw new HttpError(404, 'Volunteer not found');
  return m;
}

const cleanSkills = (skills?: string[]) => (skills ? [...new Set(skills.map((s) => s.trim()).filter(Boolean))] : undefined);

// ---------- list / export ----------

volunteersRouter.get('/', async (req, res) => {
  const q = volunteerListQuery.parse(req.query);
  const where = listWhere(orgId(req), q);
  const [total, items] = await prisma.$transaction([
    prisma.membership.count({ where }),
    prisma.membership.findMany({
      where,
      include: volunteerInclude,
      orderBy: { user: { name: 'asc' } },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  res.json({ items: items.map(toVolunteer), total, page: q.page, pageSize: q.pageSize });
});

function formatAvailability(av: Availability) {
  return WEEKDAYS.filter((d) => av[d]?.length)
    .map((d) => `${d}:${av[d]!.join('|')}`)
    .join('; ');
}

volunteersRouter.get('/export', async (req, res) => {
  const q = volunteerListQuery.omit({ page: true, pageSize: true }).parse(req.query);
  const items = await prisma.membership.findMany({
    where: listWhere(orgId(req), q),
    include: volunteerInclude,
    orderBy: { user: { name: 'asc' } },
    take: MAX_EXPORT_ROWS,
  });
  const rows = items.map(toVolunteer).map((v) => [
    v.name,
    v.email,
    v.phone,
    v.status.toLowerCase(),
    v.departments.map((d) => d.name).join('; '),
    v.skills.join('; '),
    formatAvailability(v.availability),
    v.notes,
    v.createdAt.slice(0, 10),
  ]);
  const csv = toCsv([['name', 'email', 'phone', 'status', 'departments', 'skills', 'availability', 'notes', 'joined'], ...rows]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="volunteers-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

// ---------- import ----------

const HEADER_ALIASES: Record<string, string> = {
  name: 'name',
  'full name': 'name',
  email: 'email',
  'email address': 'email',
  phone: 'phone',
  mobile: 'phone',
  'phone number': 'phone',
  departments: 'departments',
  department: 'departments',
  skills: 'skills',
  notes: 'notes',
};

const importRow = z.object({
  name: z.string().trim().min(1, 'Missing name').max(120, 'Name is too long'),
  email: z.string().trim().toLowerCase().pipe(z.email('Invalid email address')),
  phone: z.string().trim().max(40, 'Phone is too long'),
  notes: z.string().trim().max(2000, 'Notes are too long'),
});

const splitList = (v: string | undefined) =>
  (v ?? '')
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);

volunteersRouter.post('/import', express.json({ limit: '3mb' }), async (req, res) => {
  const input = importVolunteersInput.parse(req.body);
  const organizationId = orgId(req);
  const table = parseCsv(input.csv);
  if (table.length < 2) throw new HttpError(400, 'The file needs a header row and at least one volunteer');

  const header = table[0]!.map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? null);
  if (!header.includes('name') || !header.includes('email')) {
    throw new HttpError(400, 'The header row must include “name” and “email” columns');
  }
  const body = table.slice(1);
  if (body.length > MAX_IMPORT_ROWS) throw new HttpError(400, `Import at most ${MAX_IMPORT_ROWS} rows at a time`);

  const departments = await prisma.department.findMany({ where: { organizationId } });
  const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));
  const existing = await prisma.membership.findMany({
    where: { organizationId },
    select: { user: { select: { email: true } } },
  });
  const inOrg = new Set(existing.map((m) => m.user.email));

  const seen = new Map<string, number>();
  const result: ImportResult = { dryRun: input.dryRun, created: 0, rows: [] };
  const toCreate: { row: number; data: z.infer<typeof importRow>; skills: string[]; departmentIds: string[] }[] = [];

  body.forEach((cells, i) => {
    const rowNumber = i + 2;
    const record: Record<string, string> = {};
    header.forEach((key, col) => {
      if (key) record[key] = cells[col] ?? '';
    });
    const parsed = importRow.safeParse({ name: record.name ?? '', email: record.email ?? '', phone: record.phone ?? '', notes: record.notes ?? '' });
    const name = (record.name ?? '').trim();
    const email = (record.email ?? '').trim().toLowerCase();

    if (!parsed.success) {
      result.rows.push({ row: rowNumber, name, email, outcome: 'error', message: parsed.error.issues[0]!.message });
      return;
    }
    if (seen.has(parsed.data.email)) {
      result.rows.push({ row: rowNumber, name, email, outcome: 'error', message: `Same email as row ${seen.get(parsed.data.email)}` });
      return;
    }
    seen.set(parsed.data.email, rowNumber);
    if (inOrg.has(parsed.data.email)) {
      result.rows.push({ row: rowNumber, name, email, outcome: 'skip', message: 'Already in your organisation' });
      return;
    }

    const deptNames = splitList(record.departments);
    const unknown = deptNames.filter((n) => !deptByName.has(n.toLowerCase()));
    const departmentIds = deptNames.map((n) => deptByName.get(n.toLowerCase())).filter((id): id is string => !!id);
    const skills = [...new Set(splitList(record.skills))].slice(0, 20).map((s) => s.slice(0, 40));
    toCreate.push({ row: rowNumber, data: parsed.data, skills, departmentIds });
    result.rows.push({
      row: rowNumber,
      name: parsed.data.name,
      email: parsed.data.email,
      outcome: 'create',
      message: unknown.length ? `Unknown department${unknown.length > 1 ? 's' : ''} ignored: ${unknown.join(', ')}` : null,
    });
  });

  if (!input.dryRun) {
    const orgName = req.auth!.membership!.organization.name;
    for (const item of toCreate) {
      try {
        const user = await userForNewMembership(organizationId, item.data.email, item.data.name);
        await prisma.membership.create({
          data: {
            userId: user.id,
            organizationId,
            role: 'VOLUNTEER',
            status: 'INVITED',
            phone: item.data.phone || null,
            notes: item.data.notes || null,
            skills: item.skills,
            departments: { connect: item.departmentIds.map((id) => ({ id })) },
          },
        });
        result.created++;
        if (input.sendInvites) await sendInviteEmail(user, orgName, 'VOLUNTEER');
      } catch (err) {
        const row = result.rows.find((r) => r.row === item.row)!;
        row.outcome = 'error';
        row.message = err instanceof HttpError ? err.message : 'Could not be imported';
      }
    }
  }

  res.json(result);
});

// ---------- single volunteer ----------

volunteersRouter.post('/', async (req, res) => {
  const input = volunteerInput.parse(req.body);
  const organizationId = orgId(req);
  await assertDepartments(organizationId, input.departmentIds);
  const user = await userForNewMembership(organizationId, input.email, input.name);
  const m = await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId,
      role: 'VOLUNTEER',
      status: input.status ?? 'INVITED',
      phone: input.phone,
      notes: input.notes,
      skills: cleanSkills(input.skills) ?? [],
      availability: input.availability ?? {},
      departments: { connect: (input.departmentIds ?? []).map((id) => ({ id })) },
    },
    include: volunteerInclude,
  });
  if (input.sendInvite ?? true) await sendInviteEmail(user, req.auth!.membership!.organization.name, 'VOLUNTEER');
  res.status(201).json(toVolunteer(m));
});

volunteersRouter.get('/:id', async (req, res) => {
  res.json(toVolunteer(await findVolunteer(orgId(req), req.params.id as string)));
});

volunteersRouter.patch('/:id', async (req, res) => {
  const input = updateVolunteerInput.parse(req.body);
  const organizationId = orgId(req);
  const current = await findVolunteer(organizationId, req.params.id as string);
  await assertDepartments(organizationId, input.departmentIds);

  const nameChanged = input.name !== undefined && input.name !== current.user.name;
  const emailChanged = input.email !== undefined && input.email !== current.user.email;
  if (nameChanged || emailChanged) {
    if (!identityEditable(current.user)) {
      throw new HttpError(409, 'This volunteer manages their own name and email once they’ve signed in');
    }
    try {
      await prisma.user.update({
        where: { id: current.userId },
        data: { ...(nameChanged ? { name: input.name } : {}), ...(emailChanged ? { email: input.email } : {}) },
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new HttpError(409, 'That email address can’t be used');
      throw err;
    }
  }

  const m = await prisma.membership.update({
    where: { id: current.id },
    data: {
      status: input.status,
      phone: input.phone,
      notes: input.notes,
      skills: cleanSkills(input.skills),
      availability: input.availability,
      departments: input.departmentIds ? { set: input.departmentIds.map((id) => ({ id })) } : undefined,
    },
    include: volunteerInclude,
  });
  res.json(toVolunteer(m));
});

volunteersRouter.delete('/:id', async (req, res) => {
  const current = await findVolunteer(orgId(req), req.params.id as string);
  await releaseFuturePlaces(current.id, req.auth!.user.id, req.auth!.membership!.organization);
  await prisma.membership.delete({ where: { id: current.id } });
  await cleanupOrphanUser(current.userId);
  res.json({ ok: true });
});
