import { ROLE_LABELS } from '@newreplica/shared';
import { prisma } from '../db';
import type { OrgRole } from '../generated/prisma/client';
import { HttpError } from './http';

// Finds or creates the global user for an email and checks they aren't already in this organisation.
export async function userForNewMembership(organizationId: string, email: string, name: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { organizationId } } },
  });
  const current = existing?.memberships[0];
  if (current) {
    throw new HttpError(
      409,
      current.role === 'VOLUNTEER'
        ? 'This person is already a volunteer in your organisation'
        : `This person is already on your team as ${ROLE_LABELS[current.role].toLowerCase()}`,
    );
  }
  return existing ?? (await prisma.user.create({ data: { email, name } }));
}

// Removes accounts that were only ever invited (never signed in) once their last membership is gone.
export async function cleanupOrphanUser(userId: string) {
  await prisma.user.deleteMany({
    where: {
      id: userId,
      isPlatformAdmin: false,
      passwordHash: null,
      lastLoginAt: null,
      memberships: { none: {} },
    },
  });
}

export async function assertNotLastAdmin(
  organizationId: string,
  membershipId: string,
  change: { role?: OrgRole; status?: string } | 'remove',
) {
  const target = await prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
  if (!target || target.role !== 'ORG_ADMIN' || target.status !== 'ACTIVE') return;
  const losesAdmin =
    change === 'remove' ||
    (change.role !== undefined && change.role !== 'ORG_ADMIN') ||
    (change.status !== undefined && change.status !== 'ACTIVE');
  if (!losesAdmin) return;
  const otherAdmins = await prisma.membership.count({
    where: { organizationId, role: 'ORG_ADMIN', status: 'ACTIVE', id: { not: membershipId } },
  });
  if (otherAdmins === 0) throw new HttpError(409, 'Your organisation needs at least one active admin');
}
