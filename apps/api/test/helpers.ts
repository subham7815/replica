import { ORG_HEADER, type Role } from '@newreplica/shared';
import { prisma } from '../src/db';
import type { MemberStatus } from '../src/generated/prisma/client';
import { hashPassword } from '../src/lib/password';
import { signAccessToken } from '../src/lib/tokens';

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "LoginCode", "_DepartmentToMembership", "Membership", "Department", "Location", "User", "Organization" CASCADE',
  );
}

export async function createOrg(name = 'Test Org') {
  return prisma.organization.create({ data: { name, slug: `org-${Math.random().toString(36).slice(2)}` } });
}

export async function createUser(
  role: Role,
  opts: { email?: string; password?: string | null; orgId?: string; status?: MemberStatus; name?: string } = {},
) {
  const user = await prisma.user.create({
    data: {
      email: opts.email ?? `${role.toLowerCase()}-${Math.random().toString(36).slice(2)}@test.dev`,
      name: opts.name ?? role,
      isPlatformAdmin: role === 'PLATFORM_SUPER_ADMIN',
      passwordHash: opts.password === null ? null : await hashPassword(opts.password ?? 'Password123!'),
    },
  });
  if (role === 'PLATFORM_SUPER_ADMIN') return { ...user, organizationId: null, membershipId: null };

  const organizationId = opts.orgId ?? (await createOrg()).id;
  const membership = await prisma.membership.create({
    data: { userId: user.id, organizationId, role, status: opts.status ?? 'ACTIVE' },
  });
  return { ...user, organizationId, membershipId: membership.id };
}

export async function authHeaders(userId: string, organizationId?: string | null) {
  return {
    Authorization: `Bearer ${await signAccessToken(userId)}`,
    ...(organizationId ? { [ORG_HEADER]: organizationId } : {}),
  };
}
