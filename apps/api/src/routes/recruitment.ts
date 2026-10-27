import { applicationListQuery, opportunityInput, reviewInput } from '@newreplica/shared';
import { Router } from 'express';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { HttpError } from '../lib/http';
import {
  adminOpportunityInclude,
  admitVolunteer,
  applicationCounts,
  applicationInclude,
  recruitmentEmails,
  reviewerNames,
  toAdminOpportunity,
  toApplication,
} from '../lib/recruitment';
import { orgId, requireAuth, requireOrg, requirePermission } from '../middleware/auth';

const guard = [requireAuth, requireOrg, requirePermission('volunteers:manage')] as const;

async function assertOwnRefs(organizationId: string, input: { locationId?: string | null; departmentId?: string | null }) {
  if (input.locationId && !(await prisma.location.count({ where: { id: input.locationId, organizationId } }))) {
    throw new HttpError(400, 'That location doesn’t exist');
  }
  if (input.departmentId && !(await prisma.department.count({ where: { id: input.departmentId, organizationId } }))) {
    throw new HttpError(400, 'That department doesn’t exist');
  }
}

async function loadOpportunity(organizationId: string, id: string) {
  const opp = await prisma.opportunity.findFirst({ where: { id, organizationId }, include: adminOpportunityInclude });
  if (!opp) throw new HttpError(404, 'Opportunity not found');
  const counts = await applicationCounts([opp.id]);
  return toAdminOpportunity(opp, counts.get(opp.id)!);
}

// ---------- opportunities ----------

export const opportunitiesRouter = Router();
opportunitiesRouter.use(...guard);

opportunitiesRouter.get('/', async (req, res) => {
  const items = await prisma.opportunity.findMany({
    where: { organizationId: orgId(req) },
    include: adminOpportunityInclude,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
  const counts = await applicationCounts(items.map((o) => o.id));
  res.json(items.map((o) => toAdminOpportunity(o, counts.get(o.id)!)));
});

opportunitiesRouter.get('/:id', async (req, res) => {
  res.json(await loadOpportunity(orgId(req), req.params.id as string));
});

opportunitiesRouter.post('/', async (req, res) => {
  const input = opportunityInput.parse(req.body);
  const organizationId = orgId(req);
  await assertOwnRefs(organizationId, input);
  const opp = await prisma.opportunity.create({
    data: {
      ...input,
      organizationId,
      questions: input.questions ?? [],
      publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
    },
  });
  res.status(201).json(await loadOpportunity(organizationId, opp.id));
});

opportunitiesRouter.patch('/:id', async (req, res) => {
  const input = opportunityInput.partial().parse(req.body);
  const organizationId = orgId(req);
  const current = await prisma.opportunity.findFirst({ where: { id: req.params.id as string, organizationId } });
  if (!current) throw new HttpError(404, 'Opportunity not found');
  await assertOwnRefs(organizationId, input);
  await prisma.opportunity.update({
    where: { id: current.id },
    data: {
      ...input,
      ...(input.status === 'PUBLISHED' && !current.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });
  res.json(await loadOpportunity(organizationId, current.id));
});

opportunitiesRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.opportunity.deleteMany({ where: { id: req.params.id as string, organizationId: orgId(req) } });
  if (!count) throw new HttpError(404, 'Opportunity not found');
  res.json({ ok: true });
});

// ---------- applications ----------

export const applicationsRouter = Router();
applicationsRouter.use(...guard);

applicationsRouter.get('/', async (req, res) => {
  const q = applicationListQuery.parse(req.query);
  const organizationId = orgId(req);
  const where: Prisma.ApplicationWhereInput = { organizationId };
  if (q.status) where.status = q.status;
  if (q.opportunityId) where.opportunityId = q.opportunityId;

  const [total, pendingTotal, items] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.count({ where: { organizationId, status: 'PENDING' } }),
    prisma.application.findMany({
      where,
      include: applicationInclude(organizationId),
      // Oldest pending first so nobody waits longest; otherwise newest first.
      orderBy: { createdAt: q.status === 'PENDING' ? 'asc' : 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  const names = await reviewerNames(items.map((a) => a.reviewedById));
  res.json({ items: items.map((a) => toApplication(a, names)), total, page: q.page, pageSize: q.pageSize, pendingTotal });
});

async function loadApplication(organizationId: string, id: string) {
  const a = await prisma.application.findFirst({ where: { id, organizationId }, include: applicationInclude(organizationId) });
  if (!a) throw new HttpError(404, 'Application not found');
  return a;
}

applicationsRouter.get('/:id', async (req, res) => {
  const a = await loadApplication(orgId(req), req.params.id as string);
  res.json(toApplication(a, await reviewerNames([a.reviewedById])));
});

applicationsRouter.post('/:id/approve', async (req, res) => {
  const { note } = reviewInput.parse(req.body ?? {});
  const organizationId = orgId(req);
  const current = await loadApplication(organizationId, req.params.id as string);
  if (current.status === 'APPROVED') throw new HttpError(409, 'This application is already approved');

  await prisma.$transaction(async (tx) => {
    // Conditional update guards against two reviewers deciding at the same moment.
    const { count } = await tx.application.updateMany({
      where: { id: current.id, status: current.status },
      data: { status: 'APPROVED', reviewNote: note ?? null, reviewedById: req.auth!.user.id, reviewedAt: new Date() },
    });
    if (count !== 1) throw new HttpError(409, 'Someone else has just reviewed this application');
    await admitVolunteer(tx, { userId: current.userId, organizationId, phone: current.phone, departmentId: current.opportunity.departmentId });
  });

  const org = req.auth!.membership!.organization;
  await recruitmentEmails.approved(current.user, org, current.opportunity, note ?? null);
  const a = await loadApplication(organizationId, current.id);
  res.json(toApplication(a, await reviewerNames([a.reviewedById])));
});

applicationsRouter.post('/:id/reject', async (req, res) => {
  const { note } = reviewInput.parse(req.body ?? {});
  const organizationId = orgId(req);
  const current = await loadApplication(organizationId, req.params.id as string);
  if (current.status !== 'PENDING') {
    throw new HttpError(409, current.status === 'APPROVED' ? 'Approved volunteers are managed on the Volunteers page' : 'This application is already declined');
  }
  const { count } = await prisma.application.updateMany({
    where: { id: current.id, status: 'PENDING' },
    data: { status: 'REJECTED', reviewNote: note ?? null, reviewedById: req.auth!.user.id, reviewedAt: new Date() },
  });
  if (count !== 1) throw new HttpError(409, 'Someone else has just reviewed this application');

  await recruitmentEmails.rejected(current.user, req.auth!.membership!.organization, current.opportunity, note ?? null);
  const a = await loadApplication(organizationId, current.id);
  res.json(toApplication(a, await reviewerNames([a.reviewedById])));
});
