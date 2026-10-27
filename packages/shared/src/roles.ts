export const ROLES = [
  'PLATFORM_SUPER_ADMIN',
  'ORG_ADMIN',
  'COORDINATOR',
  'VOLUNTEER',
  'CHECKIN_OPERATOR',
  'AUDITOR',
] as const;

export type Role = (typeof ROLES)[number];

export const ORG_ROLES = ['ORG_ADMIN', 'COORDINATOR', 'VOLUNTEER', 'CHECKIN_OPERATOR', 'AUDITOR'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const STAFF_ROLES = ['ORG_ADMIN', 'COORDINATOR', 'CHECKIN_OPERATOR', 'AUDITOR'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  PLATFORM_SUPER_ADMIN: 'Platform super-admin',
  ORG_ADMIN: 'Organisation admin',
  COORDINATOR: 'Coordinator',
  VOLUNTEER: 'Volunteer',
  CHECKIN_OPERATOR: 'Check-in operator',
  AUDITOR: 'Read-only auditor',
};

export const MEMBER_STATUSES = ['ACTIVE', 'INVITED', 'INACTIVE', 'SUSPENDED'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: 'Active',
  INVITED: 'Invited',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};
