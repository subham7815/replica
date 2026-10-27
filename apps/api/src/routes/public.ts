import { applyInput, cleanAnswers, discoverQuery, validateAnswers } from '@newreplica/shared';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../db';
import { env } from '../env';
import type { Prisma } from '../generated/prisma/client';
import { HttpError } from '../lib/http';
import {
  admitVolunteer,
  parseQuestions,
  publicOpportunityInclude,
  recruitmentEmails,
  toPublicOpportunity,
  toPublicOrganization,
} from '../lib/recruitment';

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: 'Too many applications from this connection. Please try again later.' },
});

const listed: Prisma.OpportunityWhereInput = { status: 'PUBLISHED', visibility: 'PUBLIC' };

export const publicRouter = Router();

publicRouter.get('/opportunities', async (req, res) => {
  const q = discoverQuery.parse(req.query);
  const where: Prisma.OpportunityWhereInput = { ...listed };
  if (q.q) {
    where.OR = [
      { title: { contains: q.q, mode: 'insensitive' } },
      { summary: { contains: q.q, mode: 'insensitive' } },
      { organization: { name: { contains: q.q, mode: 'insensitive' } } },
      { location: { name: { contains: q.q, mode: 'insensitive' } } },
      { location: { address: { contains: q.q, mode: 'insensitive' } } },
    ];
  }
  const [total, items] = await prisma.$transaction([
    prisma.opportunity.count({ where }),
    prisma.opportunity.findMany({
      where,
      include: publicOpportunityInclude,
      orderBy: { publishedAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  res.json({ items: items.map(toPublicOpportunity), total, page: q.page, pageSize: q.pageSize });
});

// Unlisted opportunities are reachable by direct link; drafts and closed roles are not.
publicRouter.get('/opportunities/:id', async (req, res) => {
  const opp = await prisma.opportunity.findFirst({
    where: { id: String(req.params.id), status: 'PUBLISHED' },
    include: publicOpportunityInclude,
  });
  if (!opp) throw new HttpError(404, 'This opportunity isn’t open for applications');
  res.json(toPublicOpportunity(opp));
});

publicRouter.get('/organizations/:slug', async (req, res) => {
  const org = await prisma.organization.findUnique({ where: { slug: String(req.params.slug) } });
  if (!org) throw new HttpError(404, 'Organisation not found');
  const opportunities = await prisma.opportunity.findMany({
    where: { ...listed, organizationId: org.id },
    include: publicOpportunityInclude,
    orderBy: { publishedAt: 'desc' },
  });
  res.json({ organization: toPublicOrganization(org), opportunities: opportunities.map(toPublicOpportunity) });
});

// Always answers { ok: true } for valid input so the form can't be used to find out who has applied
// or who belongs to an organisation; the applicant's email says what actually happened.
publicRouter.post('/opportunities/:id/apply', applyLimiter, async (req, res) => {
  const input = applyInput.parse(req.body);
  const opp = await prisma.opportunity.findFirst({
    where: { id: String(req.params.id), status: 'PUBLISHED' },
    include: { organization: true },
  });
  if (!opp) throw new HttpError(404, 'This opportunity isn’t open for applications');

  const questions = parseQuestions(opp.questions);
  const fieldErrors = validateAnswers(questions, input.answers);
  if (Object.keys(fieldErrors).length) {
    res.status(400).json({ error: Object.values(fieldErrors)[0], fields: fieldErrors });
    return;
  }

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {},
    create: { email: input.email, name: input.name },
  });
  const [membership, existing] = await Promise.all([
    prisma.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: opp.organizationId } } }),
    prisma.application.findUnique({ where: { opportunityId_userId: { opportunityId: opp.id, userId: user.id } } }),
  ]);

  if (user.disabled || membership?.status === 'SUSPENDED') {
    res.json({ ok: true });
    return;
  }
  if (existing) {
    await recruitmentEmails.duplicate(user, opp.organization, opp);
    res.json({ ok: true });
    return;
  }

  const open = opp.signupMode === 'OPEN';
  await prisma.$transaction(async (tx) => {
    await tx.application.create({
      data: {
        opportunityId: opp.id,
        organizationId: opp.organizationId,
        userId: user.id,
        phone: input.phone ?? null,
        answers: cleanAnswers(questions, input.answers),
        status: open ? 'APPROVED' : 'PENDING',
        reviewedAt: open ? new Date() : null,
      },
    });
    if (open) {
      await admitVolunteer(tx, { userId: user.id, organizationId: opp.organizationId, phone: input.phone ?? null, departmentId: opp.departmentId });
    }
  });

  await (open ? recruitmentEmails.joined : recruitmentEmails.received)(user, opp.organization, opp);
  res.status(201).json({ ok: true });
});
