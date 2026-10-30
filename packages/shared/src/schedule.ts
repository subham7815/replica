import { z } from 'zod';

// Cancelling closer to the start than this is recorded as a late cancellation.
export const LATE_CANCEL_HOURS = 24;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .transform((v) => (v === '' ? null : v))
    .nullish();

const namedRef = z.object({ id: z.string(), name: z.string() });

// ---------- events ----------

export const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CANCELLED: 'Cancelled',
};

export const eventInput = z.object({
  title: z.string().trim().min(3, 'Give the event a title').max(120),
  description: optionalText(5000),
  locationId: z.string().nullish(),
  departmentId: z.string().nullish(),
  // Cancelling has its own endpoint because it notifies everyone on the rota.
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});
export type EventInput = z.input<typeof eventInput>;

export const EVENT_SCOPES = ['upcoming', 'past', 'all'] as const;
export type EventScope = (typeof EVENT_SCOPES)[number];

export const eventListQuery = z.object({
  scope: z.enum(EVENT_SCOPES).default('upcoming'),
});
export type EventListQuery = Partial<z.infer<typeof eventListQuery>>;

export const cancelInput = z.object({ reason: optionalText(500) });
export type CancelInput = z.input<typeof cancelInput>;

// ---------- shifts ----------

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// Times are wall-clock in the organisation's time zone. An end time earlier than the start means the shift runs past midnight.
export const shiftInput = z
  .object({
    title: z.string().trim().min(1, 'Name the role, e.g. "Sorting"').max(120),
    date: z.string().regex(DATE, 'Use the format YYYY-MM-DD'),
    startTime: z.string().regex(TIME, 'Use 24-hour time, e.g. 09:00'),
    endTime: z.string().regex(TIME, 'Use 24-hour time, e.g. 12:30'),
    capacity: z.coerce.number().int('Use a whole number').min(1, 'At least 1 person').max(500, 'At most 500 people'),
    waitlistEnabled: z.boolean().default(true),
    notes: optionalText(1000),
  })
  .refine((s) => s.startTime !== s.endTime, { message: 'End time must differ from the start time', path: ['endTime'] });
export type ShiftInput = z.input<typeof shiftInput>;

export const ASSIGNMENT_STATUSES = ['CONFIRMED', 'WAITLISTED', 'CANCELLED'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];
export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  CONFIRMED: 'Confirmed',
  WAITLISTED: 'Waitlist',
  CANCELLED: 'Cancelled',
};

const shiftCore = {
  id: z.string(),
  eventId: z.string(),
  title: z.string(),
  // ISO instants plus the same times in the organisation's zone, ready for display and editing.
  startsAt: z.string(),
  endsAt: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  capacity: z.number(),
  waitlistEnabled: z.boolean(),
  notes: z.string().nullable(),
  confirmedCount: z.number(),
  waitlistCount: z.number(),
  spotsLeft: z.number(),
};

export const rosterEntrySchema = z.object({
  id: z.string(),
  volunteerId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  role: z.string(),
  status: z.enum(ASSIGNMENT_STATUSES),
  source: z.enum(['SELF', 'STAFF']),
  waitlistPosition: z.number().nullable(),
  joinedAt: z.string(),
  promotedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
  lateCancel: z.boolean(),
});
export type RosterEntry = z.infer<typeof rosterEntrySchema>;

export const staffShiftSchema = z.object({ ...shiftCore, roster: z.array(rosterEntrySchema) });
export type StaffShift = z.infer<typeof staffShiftSchema>;

const eventCore = {
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  location: namedRef.extend({ address: z.string().nullable() }).nullable(),
  department: namedRef.nullable(),
  timezone: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
};

export const eventSummarySchema = z.object({
  ...eventCore,
  status: z.enum(EVENT_STATUSES),
  shiftCount: z.number(),
  capacity: z.number(),
  confirmedCount: z.number(),
  waitlistCount: z.number(),
  // Unfilled places on shifts that haven't started yet.
  openSpots: z.number(),
  publishedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
});
export type EventSummary = z.infer<typeof eventSummarySchema>;

export const eventDetailSchema = eventSummarySchema.extend({ shifts: z.array(staffShiftSchema) });
export type EventDetail = z.infer<typeof eventDetailSchema>;

export const assignInput = z.object({ volunteerId: z.string().min(1, 'Choose a volunteer') });
export type AssignInput = z.input<typeof assignInput>;

export const coverCandidateSchema = z.object({
  volunteerId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  available: z.boolean(),
  inDepartment: z.boolean(),
  upcomingShifts: z.number(),
});
export type CoverCandidate = z.infer<typeof coverCandidateSchema>;

// ---------- volunteer self-service ----------

export const openShiftSchema = z.object({
  ...shiftCore,
  myStatus: z.enum(['CONFIRMED', 'WAITLISTED']).nullable(),
  myWaitlistPosition: z.number().nullable(),
});
export type OpenShift = z.infer<typeof openShiftSchema>;

export const openEventSchema = z.object({ ...eventCore, shifts: z.array(openShiftSchema) });
export type OpenEvent = z.infer<typeof openEventSchema>;

export const myShiftSchema = z.object({
  assignmentId: z.string(),
  status: z.enum(['CONFIRMED', 'WAITLISTED']),
  waitlistPosition: z.number().nullable(),
  shift: z.object(shiftCore),
  event: z.object({ id: z.string(), title: z.string(), location: eventCore.location }),
  timezone: z.string(),
});
export type MyShift = z.infer<typeof myShiftSchema>;

export const signupResultSchema = z.object({
  status: z.enum(['CONFIRMED', 'WAITLISTED']),
  waitlistPosition: z.number().nullable(),
});
export type SignupResult = z.infer<typeof signupResultSchema>;

export function isLateCancel(startsAt: string | Date, now = new Date()) {
  return new Date(startsAt).getTime() - now.getTime() < LATE_CANCEL_HOURS * 3600_000;
}
