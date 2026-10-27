import type {
  Availability,
  Department as PublicDepartment,
  Location as PublicLocation,
  OrganizationSettings,
  User as PublicUser,
  TeamMember,
  Volunteer,
} from '@newreplica/shared';
import { availabilitySchema, STAFF_ROLES } from '@newreplica/shared';
import type { Department, Location, Membership, Organization, User } from '../generated/prisma/client';
import type { AuthContext } from '../middleware/auth';

export function toPublicUser(auth: AuthContext): PublicUser {
  const { user, membership } = auth;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: auth.role,
    organization: membership
      ? { id: membership.organization.id, name: membership.organization.name, slug: membership.organization.slug }
      : null,
    memberships: user.memberships
      .filter((m) => m.status !== 'SUSPENDED')
      .map((m) => ({
        id: m.id,
        role: m.role,
        status: m.status,
        organization: { id: m.organization.id, name: m.organization.name, slug: m.organization.slug },
      })),
  };
}

export function toOrganizationSettings(o: Organization): OrganizationSettings {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    contactEmail: o.contactEmail,
    phone: o.phone,
    website: o.website,
    description: o.description,
    timezone: o.timezone,
    brandColor: o.brandColor,
    logoUrl: o.logoUrl,
  };
}

export function toLocation(l: Location): PublicLocation {
  return { id: l.id, name: l.name, address: l.address, notes: l.notes };
}

export function toDepartment(d: Department & { _count: { memberships: number } }): PublicDepartment {
  return { id: d.id, name: d.name, description: d.description, memberCount: d._count.memberships };
}

export function toTeamMember(m: Membership & { user: User }, currentUserId: string): TeamMember {
  if (!(STAFF_ROLES as readonly string[]).includes(m.role)) throw new Error('not a staff membership');
  return {
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role as TeamMember['role'],
    status: m.status,
    lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
    isYou: m.userId === currentUserId,
  };
}

export type VolunteerRecord = Membership & {
  user: User & { _count: { memberships: number } };
  departments: Pick<Department, 'id' | 'name'>[];
};

export const volunteerInclude = {
  user: { include: { _count: { select: { memberships: true } } } },
  departments: { select: { id: true, name: true }, orderBy: { name: 'asc' as const } },
};

// A coordinator may correct a name/email only before the person has claimed the account and only if no
// other organisation shares it; after that the identity belongs to the volunteer.
export function identityEditable(user: VolunteerRecord['user']) {
  return !user.passwordHash && !user.lastLoginAt && user._count.memberships <= 1 && !user.isPlatformAdmin;
}

export function toVolunteer(m: VolunteerRecord): Volunteer {
  const parsed = availabilitySchema.safeParse(m.availability ?? {});
  const availability: Availability = parsed.success ? parsed.data : {};
  return {
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    phone: m.phone,
    status: m.status,
    skills: m.skills,
    notes: m.notes,
    availability,
    departments: m.departments,
    identityEditable: identityEditable(m.user),
    lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}
