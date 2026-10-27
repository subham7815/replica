import { departmentInput, locationInput, updateOrganizationInput } from '@newreplica/shared';
import { Router } from 'express';
import { prisma } from '../db';
import { HttpError } from '../lib/http';
import { isUniqueViolation } from '../lib/prisma-errors';
import { toDepartment, toLocation, toOrganizationSettings } from '../lib/serialize';
import { orgId, requireAuth, requireOrg, requirePermission } from '../middleware/auth';

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const organizationRouter = Router();

// ---------- organisation profile ----------

organizationRouter.get('/organization', requireAuth, requireOrg, async (req, res) => {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId(req) } });
  res.json(toOrganizationSettings(org));
});

organizationRouter.patch('/organization', requireAuth, requireOrg, requirePermission('org:manage'), async (req, res) => {
  const input = updateOrganizationInput.parse(req.body);
  if (input.timezone && !isValidTimezone(input.timezone)) throw new HttpError(400, 'Choose a valid time zone');
  const org = await prisma.organization.update({ where: { id: orgId(req) }, data: input });
  res.json(toOrganizationSettings(org));
});

// ---------- locations ----------

organizationRouter.get('/locations', requireAuth, requireOrg, async (req, res) => {
  const items = await prisma.location.findMany({ where: { organizationId: orgId(req) }, orderBy: { name: 'asc' } });
  res.json(items.map(toLocation));
});

organizationRouter.post('/locations', requireAuth, requireOrg, requirePermission('org:manage'), async (req, res) => {
  const input = locationInput.parse(req.body);
  try {
    const location = await prisma.location.create({ data: { ...input, organizationId: orgId(req) } });
    res.status(201).json(toLocation(location));
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'A location with this name already exists');
    throw err;
  }
});

organizationRouter.patch('/locations/:id', requireAuth, requireOrg, requirePermission('org:manage'), async (req, res) => {
  const input = locationInput.parse(req.body);
  const where = { id: req.params.id as string, organizationId: orgId(req) };
  try {
    const { count } = await prisma.location.updateMany({ where, data: input });
    if (!count) throw new HttpError(404, 'Location not found');
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'A location with this name already exists');
    throw err;
  }
  res.json(toLocation(await prisma.location.findFirstOrThrow({ where })));
});

organizationRouter.delete('/locations/:id', requireAuth, requireOrg, requirePermission('org:manage'), async (req, res) => {
  const { count } = await prisma.location.deleteMany({ where: { id: req.params.id as string, organizationId: orgId(req) } });
  if (!count) throw new HttpError(404, 'Location not found');
  res.json({ ok: true });
});

// ---------- departments ----------

const withCount = { _count: { select: { memberships: true } } };

organizationRouter.get('/departments', requireAuth, requireOrg, async (req, res) => {
  const items = await prisma.department.findMany({
    where: { organizationId: orgId(req) },
    include: withCount,
    orderBy: { name: 'asc' },
  });
  res.json(items.map(toDepartment));
});

organizationRouter.post('/departments', requireAuth, requireOrg, requirePermission('org:manage'), async (req, res) => {
  const input = departmentInput.parse(req.body);
  try {
    const dept = await prisma.department.create({ data: { ...input, organizationId: orgId(req) }, include: withCount });
    res.status(201).json(toDepartment(dept));
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'A department with this name already exists');
    throw err;
  }
});

organizationRouter.patch('/departments/:id', requireAuth, requireOrg, requirePermission('org:manage'), async (req, res) => {
  const input = departmentInput.parse(req.body);
  const where = { id: req.params.id as string, organizationId: orgId(req) };
  try {
    const { count } = await prisma.department.updateMany({ where, data: input });
    if (!count) throw new HttpError(404, 'Department not found');
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'A department with this name already exists');
    throw err;
  }
  res.json(toDepartment(await prisma.department.findFirstOrThrow({ where, include: withCount })));
});

organizationRouter.delete('/departments/:id', requireAuth, requireOrg, requirePermission('org:manage'), async (req, res) => {
  const { count } = await prisma.department.deleteMany({ where: { id: req.params.id as string, organizationId: orgId(req) } });
  if (!count) throw new HttpError(404, 'Department not found');
  res.json({ ok: true });
});
