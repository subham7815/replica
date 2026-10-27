import { z } from 'zod';
import { MEMBER_STATUSES, ORG_ROLES, ROLES, STAFF_ROLES } from './roles';

export const healthSchema = z.object({
  status: z.literal('ok'),
  db: z.enum(['up', 'down']),
  time: z.string(),
});
export type Health = z.infer<typeof healthSchema>;

// ---------- field helpers ----------

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

// Form fields arrive as '' when empty; store those as null.
const optionalText = (max: number, message = `Must be at most ${max} characters`) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => (v === '' ? null : v))
    .nullish();

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address')
  .transform((v) => (v === '' ? null : v))
  .nullish();

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/\S+\.\S+/.test(v), 'Enter a full web address starting with https://')
  .transform((v) => (v === '' ? null : v))
  .nullish();

// ---------- auth ----------

export const loginInput = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginInput>;

export const registerOrganizationInput = z.object({
  organizationName: z.string().trim().min(2, 'Organisation name is too short').max(120),
  name: z.string().trim().min(1, 'Enter your name').max(120),
  email,
  password,
});
export type RegisterOrganizationInput = z.infer<typeof registerOrganizationInput>;

export const requestCodeInput = z.object({ email });
export type RequestCodeInput = z.infer<typeof requestCodeInput>;

export const verifyCodeInput = z.union([
  z.object({ token: z.string().min(16) }),
  z.object({ email, code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code') }),
]);
export type VerifyCodeInput = z.infer<typeof verifyCodeInput>;

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const membershipSummarySchema = z.object({
  id: z.string(),
  role: z.enum(ORG_ROLES),
  status: z.enum(MEMBER_STATUSES),
  organization: organizationSchema,
});
export type MembershipSummary = z.infer<typeof membershipSummarySchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  // Role and organisation of the active membership (or PLATFORM_SUPER_ADMIN with no organisation).
  role: z.enum(ROLES),
  organization: organizationSchema.nullable(),
  memberships: z.array(membershipSummarySchema),
});
export type User = z.infer<typeof userSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const requestCodeResponseSchema = z.object({
  ok: z.literal(true),
  // Only present when the API runs with AUTH_DEV_EXPOSE_CODES=true (local development).
  dev: z.object({ code: z.string(), token: z.string() }).optional(),
});
export type RequestCodeResponse = z.infer<typeof requestCodeResponseSchema>;

// ---------- organisation settings ----------

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const organizationSettingsSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  contactEmail: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  timezone: z.string(),
  brandColor: z.string(),
  logoUrl: z.string().nullable(),
});
export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

export const updateOrganizationInput = z.object({
  name: z.string().trim().min(2, 'Organisation name is too short').max(120).optional(),
  contactEmail: optionalEmail,
  phone: optionalText(40),
  website: optionalUrl,
  description: optionalText(1000),
  timezone: z.string().trim().min(1).max(64).optional(),
  brandColor: z.string().trim().regex(HEX_COLOR, 'Use a hex colour like #c7102c').optional(),
  logoUrl: optionalUrl,
});
export type UpdateOrganizationInput = z.input<typeof updateOrganizationInput>;

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
});
export type Location = z.infer<typeof locationSchema>;

export const locationInput = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120),
  address: optionalText(300),
  notes: optionalText(1000),
});
export type LocationInput = z.input<typeof locationInput>;

export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  memberCount: z.number(),
});
export type Department = z.infer<typeof departmentSchema>;

export const departmentInput = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120),
  description: optionalText(500),
});
export type DepartmentInput = z.input<typeof departmentInput>;

// ---------- team (staff memberships) ----------

export const teamMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(STAFF_ROLES),
  status: z.enum(MEMBER_STATUSES),
  lastLoginAt: z.string().nullable(),
  isYou: z.boolean(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const inviteStaffInput = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120),
  email,
  role: z.enum(STAFF_ROLES),
});
export type InviteStaffInput = z.infer<typeof inviteStaffInput>;

export const updateStaffInput = z.object({
  role: z.enum(STAFF_ROLES).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});
export type UpdateStaffInput = z.infer<typeof updateStaffInput>;

// ---------- volunteers ----------

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const DAY_PARTS = ['morning', 'afternoon', 'evening'] as const;
export type DayPart = (typeof DAY_PARTS)[number];
export const DAY_PART_LABELS: Record<DayPart, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

export const availabilitySchema = z.partialRecord(z.enum(WEEKDAYS), z.array(z.enum(DAY_PARTS)).max(3));
export type Availability = z.infer<typeof availabilitySchema>;

export const volunteerSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.enum(MEMBER_STATUSES),
  skills: z.array(z.string()),
  notes: z.string().nullable(),
  availability: availabilitySchema,
  departments: z.array(z.object({ id: z.string(), name: z.string() })),
  // False once the person has signed in or belongs to another organisation: their name/email are theirs to change.
  identityEditable: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Volunteer = z.infer<typeof volunteerSchema>;

const skills = z
  .array(z.string().trim().min(1).max(40, 'Each skill must be at most 40 characters'))
  .max(20, 'Add at most 20 skills');

export const volunteerInput = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120),
  email,
  phone: optionalText(40),
  status: z.enum(MEMBER_STATUSES).optional(),
  skills: skills.optional(),
  notes: optionalText(2000),
  availability: availabilitySchema.optional(),
  departmentIds: z.array(z.string()).max(50).optional(),
  sendInvite: z.boolean().optional(),
});
export type VolunteerInput = z.input<typeof volunteerInput>;

export const updateVolunteerInput = volunteerInput.omit({ sendInvite: true }).partial();
export type UpdateVolunteerInput = z.input<typeof updateVolunteerInput>;

export const volunteerListQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(MEMBER_STATUSES).optional(),
  departmentId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type VolunteerListQuery = Partial<z.infer<typeof volunteerListQuery>>;

export const volunteerListSchema = z.object({
  items: z.array(volunteerSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type VolunteerList = z.infer<typeof volunteerListSchema>;

export const importVolunteersInput = z.object({
  csv: z.string().min(1, 'The file is empty').max(2_000_000, 'The file is too large (2 MB max)'),
  dryRun: z.boolean().default(true),
  sendInvites: z.boolean().default(false),
});
export type ImportVolunteersInput = z.input<typeof importVolunteersInput>;

export const importResultSchema = z.object({
  dryRun: z.boolean(),
  created: z.number(),
  rows: z.array(
    z.object({
      row: z.number(),
      name: z.string(),
      email: z.string(),
      outcome: z.enum(['create', 'skip', 'error']),
      message: z.string().nullable(),
    }),
  ),
});
export type ImportResult = z.infer<typeof importResultSchema>;

export const VOLUNTEER_CSV_TEMPLATE =
  'name,email,phone,departments,skills,notes\n' +
  'Priya Shah,priya@example.com,07700 900123,Warehouse;Front desk,First aid;Driving,Prefers Saturdays\n';
