import type { Role } from './roles';

export const PERMISSIONS = [
  'tenants:manage',
  'org:manage',
  'programmes:manage',
  'volunteers:manage',
  'shifts:manage',
  'attendance:manage',
  'attendance:checkin',
  'communications:send',
  'reports:view',
  'audit:view',
  'self:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'tenants:manage': 'Manage organisations on the platform',
  'org:manage': 'Organisation settings, team and permissions',
  'programmes:manage': 'Create events and programmes',
  'volunteers:manage': 'Manage the volunteer database',
  'shifts:manage': 'Schedule shifts and cover',
  'attendance:manage': 'Correct attendance and approve hours',
  'attendance:checkin': 'Check volunteers in and out',
  'communications:send': 'Send emails to volunteers',
  'reports:view': 'View reports and dashboards',
  'audit:view': 'View the audit history',
  'self:manage': 'Manage own profile, availability and shifts',
};

// Single source of truth: the API enforces this map and the clients use it to show/hide UI.
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  PLATFORM_SUPER_ADMIN: ['tenants:manage'],
  ORG_ADMIN: [
    'org:manage',
    'programmes:manage',
    'volunteers:manage',
    'shifts:manage',
    'attendance:manage',
    'attendance:checkin',
    'communications:send',
    'reports:view',
    'audit:view',
    'self:manage',
  ],
  COORDINATOR: [
    'programmes:manage',
    'volunteers:manage',
    'shifts:manage',
    'attendance:manage',
    'attendance:checkin',
    'communications:send',
    'self:manage',
  ],
  VOLUNTEER: ['self:manage'],
  CHECKIN_OPERATOR: ['attendance:checkin', 'self:manage'],
  AUDITOR: ['reports:view', 'audit:view', 'self:manage'],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return !!role && ROLE_PERMISSIONS[role].includes(permission);
}
