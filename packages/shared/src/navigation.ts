import { can, type Permission } from './permissions';
import type { Role } from './roles';

export interface NavItem {
  key: string;
  label: string;
  description: string;
  permission: Permission;
  // Build-plan step that delivers this module; null once it ships.
  comingInStep: number | null;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'tenants', label: 'Tenants', description: 'Organisations on the platform', permission: 'tenants:manage', comingInStep: null },
  { key: 'my-shifts', label: 'My shifts', description: 'Sign up for shifts, join waitlists and cancel', permission: 'self:manage', comingInStep: null },
  { key: 'volunteers', label: 'Volunteers', description: 'Profiles, status, search and CSV import/export', permission: 'volunteers:manage', comingInStep: null },
  { key: 'recruitment', label: 'Recruitment', description: 'Public opportunities and application review', permission: 'volunteers:manage', comingInStep: null },
  { key: 'schedule', label: 'Events & shifts', description: 'Programmes, rotas, capacity and cover', permission: 'shifts:manage', comingInStep: null },
  { key: 'check-in', label: 'Check-in', description: 'QR and manual check-in/out', permission: 'attendance:checkin', comingInStep: 7 },
  { key: 'communications', label: 'Communications', description: 'Confirmation, reminder and cancellation emails', permission: 'communications:send', comingInStep: 6 },
  { key: 'reports', label: 'Reports', description: 'Coverage, vacancies, attendance and hours', permission: 'reports:view', comingInStep: 8 },
  { key: 'audit', label: 'Audit log', description: 'Who changed what, and when', permission: 'audit:view', comingInStep: 8 },
  { key: 'settings', label: 'Organisation', description: 'Profile, locations, departments and branding', permission: 'org:manage', comingInStep: null },
];

export function navItemsFor(role: Role | null | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => can(role, item.permission));
}
