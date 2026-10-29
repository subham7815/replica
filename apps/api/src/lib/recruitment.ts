import {
  questionsSchema,
  type Application as PublicApplication,
  type Opportunity as PublicOpportunityAdmin,
  type PublicOpportunity,
  type PublicOrganization,
  type Question,
} from '@newreplica/shared';
import { prisma } from '../db';
import type { Application, Department, Location, Opportunity, Organization, Prisma, User } from '../generated/prisma/client';
import { env } from '../env';
import { sendMail } from './mailer';

export function parseQuestions(value: unknown): Question[] {
  const parsed = questionsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function toPublicOrganization(o: Organization): PublicOrganization {
  return {
    name: o.name,
    slug: o.slug,
    description: o.description,
    website: o.website,
    contactEmail: o.contactEmail,
    brandColor: o.brandColor,
    logoUrl: o.logoUrl,
  };
}

export const publicOpportunityInclude = { organization: true, location: true, department: true } as const;

export function toPublicOpportunity(
  o: Opportunity & { organization: Organization; location: Location | null; department: Department | null },
): PublicOpportunity {
  return {
    id: o.id,
    title: o.title,
    summary: o.summary,
    description: o.description,
    commitment: o.commitment,
    location: o.location ? { name: o.location.name, address: o.location.address } : null,
    department: o.department?.name ?? null,
    signupMode: o.signupMode,
    questions: parseQuestions(o.questions),
    organization: toPublicOrganization(o.organization),
    publishedAt: o.publishedAt?.toISOString() ?? null,
  };
}

export const adminOpportunityInclude = { location: true, department: true } as const;

export function toAdminOpportunity(
  o: Opportunity & { location: Location | null; department: Department | null },
  counts: { pending: number; approved: number },
): PublicOpportunityAdmin {
  return {
    id: o.id,
    title: o.title,
    summary: o.summary,
    description: o.description,
    commitment: o.commitment,
    location: o.location ? { id: o.location.id, name: o.location.name, address: o.location.address } : null,
    department: o.department ? { id: o.department.id, name: o.department.name } : null,
    status: o.status,
    signupMode: o.signupMode,
    visibility: o.visibility,
    questions: parseQuestions(o.questions),
    publishedAt: o.publishedAt?.toISOString() ?? null,
    pendingCount: counts.pending,
    approvedCount: counts.approved,
    createdAt: o.createdAt.toISOString(),
  };
}

export async function applicationCounts(opportunityIds: string[]) {
  const rows = await prisma.application.groupBy({
    by: ['opportunityId', 'status'],
    where: { opportunityId: { in: opportunityIds } },
    _count: { _all: true },
  });
  const map = new Map<string, { pending: number; approved: number }>();
  for (const id of opportunityIds) map.set(id, { pending: 0, approved: 0 });
  for (const r of rows) {
    const c = map.get(r.opportunityId)!;
    if (r.status === 'PENDING') c.pending = r._count._all;
    if (r.status === 'APPROVED') c.approved = r._count._all;
  }
  return map;
}

export type ApplicationRecord = Application & {
  user: User & { memberships: { id: string; role: string }[] };
  opportunity: Opportunity;
};

export const applicationInclude = (organizationId: string) =>
  ({
    user: { include: { memberships: { where: { organizationId }, select: { id: true, role: true } } } },
    opportunity: true,
  }) satisfies Prisma.ApplicationInclude;

export function formatAnswers(questions: Question[], answers: unknown) {
  const a = (answers ?? {}) as Record<string, unknown>;
  return questions
    .filter((q) => a[q.id] !== undefined && a[q.id] !== '')
    .map((q) => ({ question: q.label, answer: typeof a[q.id] === 'boolean' ? (a[q.id] ? 'Yes' : 'No') : String(a[q.id]) }));
}

export function toApplication(a: ApplicationRecord, reviewerNames: Map<string, string>): PublicApplication {
  const membership = a.user.memberships[0];
  return {
    id: a.id,
    status: a.status,
    name: a.user.name,
    email: a.user.email,
    phone: a.phone,
    answers: formatAnswers(parseQuestions(a.opportunity.questions), a.answers),
    opportunity: { id: a.opportunity.id, title: a.opportunity.title },
    reviewNote: a.reviewNote,
    reviewedBy: a.reviewedById ? (reviewerNames.get(a.reviewedById) ?? null) : null,
    reviewedAt: a.reviewedAt?.toISOString() ?? null,
    volunteerId: membership?.role === 'VOLUNTEER' ? membership.id : null,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function reviewerNames(ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map<string, string>();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, u.name]));
}

// Makes the applicant a volunteer of the organisation (or reuses their existing membership) and adds the role's department.
export async function admitVolunteer(
  tx: Prisma.TransactionClient,
  opts: { userId: string; organizationId: string; phone: string | null; departmentId: string | null },
) {
  const existing = await tx.membership.findUnique({
    where: { userId_organizationId: { userId: opts.userId, organizationId: opts.organizationId } },
  });
  const connect = opts.departmentId ? { departments: { connect: { id: opts.departmentId } } } : {};
  if (existing) {
    if (existing.status === 'SUSPENDED') return existing;
    return tx.membership.update({
      where: { id: existing.id },
      data: { ...(existing.phone ? {} : { phone: opts.phone }), ...(existing.status === 'INACTIVE' ? { status: 'ACTIVE' } : {}), ...connect },
    });
  }
  return tx.membership.create({
    data: {
      userId: opts.userId,
      organizationId: opts.organizationId,
      role: 'VOLUNTEER',
      status: 'INVITED',
      phone: opts.phone,
      ...connect,
    },
  });
}

const signInLine = () => `Sign in with your email address. We'll send you a one-time code, no password needed:\n${env.WEB_APP_URL}/login`;

export const recruitmentEmails = {
  received: (to: User, org: Organization, opp: Opportunity) =>
    sendMail({
      to: to.email,
      subject: `We've received your application to ${org.name}`,
      text: `Hi ${to.name},\n\nThanks for applying for "${opp.title}" with ${org.name}. They'll review your application and you'll hear back by email.\n`,
    }),
  joined: (to: User, org: Organization, opp: Opportunity) =>
    sendMail({
      to: to.email,
      subject: `You've joined ${org.name} on DexServe`,
      text: `Hi ${to.name},\n\nYou're now signed up for "${opp.title}" with ${org.name}.\n\n${signInLine()}\n`,
    }),
  duplicate: (to: User, org: Organization, opp: Opportunity) =>
    sendMail({
      to: to.email,
      subject: `Your application to ${org.name}`,
      text: `Hi ${to.name},\n\nWe already have your application for "${opp.title}" with ${org.name}, so there's nothing more to do. You'll hear back by email.\n`,
    }),
  approved: (to: User, org: Organization, opp: Opportunity, note: string | null) =>
    sendMail({
      to: to.email,
      subject: `You're in: ${opp.title} at ${org.name}`,
      text: `Hi ${to.name},\n\nGood news: ${org.name} has approved your application for "${opp.title}".${note ? `\n\nMessage from the team: ${note}` : ''}\n\n${signInLine()}\n`,
    }),
  rejected: (to: User, org: Organization, opp: Opportunity, note: string | null) =>
    sendMail({
      to: to.email,
      subject: `Your application to ${org.name}`,
      text: `Hi ${to.name},\n\nThank you for applying for "${opp.title}" with ${org.name}. They aren't able to take your application forward this time.${note ? `\n\nMessage from the team: ${note}` : ''}\n`,
    }),
};
