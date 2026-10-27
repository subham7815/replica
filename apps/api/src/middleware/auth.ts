import { ORG_HEADER, can, type Permission, type Role } from '@newreplica/shared';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db';
import type { Membership, Organization, User } from '../generated/prisma/client';
import { HttpError } from '../lib/http';
import { verifyAccessToken } from '../lib/tokens';

export type MembershipWithOrg = Membership & { organization: Organization };
export type UserWithMemberships = User & { memberships: MembershipWithOrg[] };

export interface AuthContext {
  user: UserWithMemberships;
  membership: MembershipWithOrg | null;
  role: Role;
  organizationId: string | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export function loadUser(where: { id: string } | { email: string }) {
  return prisma.user.findUnique({
    where,
    include: { memberships: { include: { organization: true }, orderBy: { createdAt: 'asc' } } },
  });
}

export function usableMemberships(user: UserWithMemberships) {
  return user.memberships.filter((m) => m.status !== 'SUSPENDED');
}

// Picks the membership a request acts through: the one named in the header, or the person's first organisation.
export function resolveAuth(user: UserWithMemberships, requestedOrgId?: string | null): AuthContext | null {
  const usable = usableMemberships(user);
  let membership: MembershipWithOrg | null = null;
  if (requestedOrgId) {
    membership = usable.find((m) => m.organizationId === requestedOrgId) ?? null;
    if (!membership) throw new HttpError(403, 'You are not a member of this organisation');
  } else {
    membership = usable[0] ?? null;
  }
  if (!membership && !user.isPlatformAdmin) return null;
  return {
    user,
    membership,
    role: membership ? membership.role : 'PLATFORM_SUPER_ADMIN',
    organizationId: membership?.organizationId ?? null,
  };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const userId = token ? await verifyAccessToken(token) : null;
  if (!userId) throw new HttpError(401, 'Not signed in');

  // Loaded per request so suspensions and role changes take effect immediately.
  const user = await loadUser({ id: userId });
  if (!user || user.disabled) throw new HttpError(401, 'Not signed in');

  const orgHeader = req.headers[ORG_HEADER.toLowerCase()];
  const auth = resolveAuth(user, Array.isArray(orgHeader) ? orgHeader[0] : orgHeader);
  if (!auth) throw new HttpError(401, 'Not signed in');

  req.auth = auth;
  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!can(req.auth?.role, permission)) throw new HttpError(403, 'You do not have permission to do this');
    next();
  };
}

// Tenant scoping. Platform super-admins have no organisation, so they are refused here by design:
// access to tenant records needs the audited support-authorisation flow (Phase 3).
export function requireOrg(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth?.organizationId) throw new HttpError(403, 'This requires organisation membership');
  next();
}

export function orgId(req: Request): string {
  const id = req.auth?.organizationId;
  if (!id) throw new HttpError(403, 'This requires organisation membership');
  return id;
}
