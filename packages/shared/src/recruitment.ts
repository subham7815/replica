import { z } from 'zod';

// ---------- application form questions ----------

export const QUESTION_TYPES = ['text', 'textarea', 'select', 'yesno'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Short answer',
  textarea: 'Paragraph',
  select: 'Choose one',
  yesno: 'Yes / No',
};

export const questionSchema = z
  .object({
    id: z.string().min(1).max(40),
    label: z.string().trim().min(1, 'Every question needs a label').max(200),
    type: z.enum(QUESTION_TYPES),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  })
  .refine((q) => q.type !== 'select' || (q.options?.length ?? 0) >= 2, {
    message: 'Choice questions need at least two options',
    path: ['options'],
  });
export type Question = z.infer<typeof questionSchema>;

export const questionsSchema = z.array(questionSchema).max(15, 'Add at most 15 questions');

export type Answers = Record<string, string | boolean>;
export const answersSchema = z.record(z.string(), z.union([z.string().max(4000), z.boolean()]));

// Shared by the API and both clients so the same rules apply everywhere. Returns question-id → message.
export function validateAnswers(questions: Question[], answers: Answers): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const q of questions) {
    const v = answers[q.id];
    const empty = v === undefined || v === '' || (q.type !== 'yesno' && typeof v !== 'string');
    if (q.type === 'yesno') {
      if (v !== undefined && typeof v !== 'boolean') errors[q.id] = 'Choose yes or no';
      else if (q.required && v === undefined) errors[q.id] = 'Choose yes or no';
      continue;
    }
    if (empty) {
      if (q.required) errors[q.id] = 'This question is required';
      continue;
    }
    const text = (v as string).trim();
    if (q.required && !text) errors[q.id] = 'This question is required';
    else if (q.type === 'text' && text.length > 300) errors[q.id] = 'Keep this under 300 characters';
    else if (q.type === 'select' && !q.options?.includes(text)) errors[q.id] = 'Choose one of the options';
  }
  return errors;
}

// Drops answers to questions that don't exist so stored data always matches the form.
export function cleanAnswers(questions: Question[], answers: Answers): Answers {
  const out: Answers = {};
  for (const q of questions) {
    const v = answers[q.id];
    if (v === undefined || v === '') continue;
    out[q.id] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

export function newQuestionId() {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- opportunities ----------

export const OPPORTUNITY_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED'] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
};

export const SIGNUP_MODES = ['OPEN', 'APPROVAL'] as const;
export type SignupMode = (typeof SIGNUP_MODES)[number];
export const SIGNUP_MODE_LABELS: Record<SignupMode, string> = {
  OPEN: 'Open: anyone can join',
  APPROVAL: 'Approval: you review each application',
};

export const VISIBILITIES = ['PUBLIC', 'UNLISTED'] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLIC: 'Public: listed on Discover and your page',
  UNLISTED: 'Link only: people need the link',
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .transform((v) => (v === '' ? null : v))
    .nullish();

export const opportunityInput = z.object({
  title: z.string().trim().min(3, 'Give the role a title').max(120),
  summary: z.string().trim().min(10, 'Add a one-line summary (at least 10 characters)').max(240),
  description: optionalText(5000),
  commitment: optionalText(160),
  locationId: z.string().nullish(),
  departmentId: z.string().nullish(),
  status: z.enum(OPPORTUNITY_STATUSES).optional(),
  signupMode: z.enum(SIGNUP_MODES).optional(),
  visibility: z.enum(VISIBILITIES).optional(),
  questions: questionsSchema.optional(),
});
export type OpportunityInput = z.input<typeof opportunityInput>;

const namedRef = z.object({ id: z.string(), name: z.string() });

export const opportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  description: z.string().nullable(),
  commitment: z.string().nullable(),
  location: namedRef.extend({ address: z.string().nullable() }).nullable(),
  department: namedRef.nullable(),
  status: z.enum(OPPORTUNITY_STATUSES),
  signupMode: z.enum(SIGNUP_MODES),
  visibility: z.enum(VISIBILITIES),
  questions: z.array(questionSchema),
  publishedAt: z.string().nullable(),
  pendingCount: z.number(),
  approvedCount: z.number(),
  createdAt: z.string(),
});
export type Opportunity = z.infer<typeof opportunitySchema>;

// ---------- public (no sign-in) ----------

export const publicOrganizationSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  website: z.string().nullable(),
  contactEmail: z.string().nullable(),
  brandColor: z.string(),
  logoUrl: z.string().nullable(),
});
export type PublicOrganization = z.infer<typeof publicOrganizationSchema>;

export const publicOpportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  description: z.string().nullable(),
  commitment: z.string().nullable(),
  location: z.object({ name: z.string(), address: z.string().nullable() }).nullable(),
  department: z.string().nullable(),
  signupMode: z.enum(SIGNUP_MODES),
  questions: z.array(questionSchema),
  organization: publicOrganizationSchema,
  publishedAt: z.string().nullable(),
});
export type PublicOpportunity = z.infer<typeof publicOpportunitySchema>;

export const publicOpportunityListSchema = z.object({
  items: z.array(publicOpportunitySchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type PublicOpportunityList = z.infer<typeof publicOpportunityListSchema>;

export const publicOrganizationPageSchema = z.object({
  organization: publicOrganizationSchema,
  opportunities: z.array(publicOpportunitySchema),
});
export type PublicOrganizationPage = z.infer<typeof publicOrganizationPageSchema>;

export const discoverQuery = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type DiscoverQuery = Partial<z.infer<typeof discoverQuery>>;

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));

export const applyInput = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(120),
  email,
  phone: optionalText(40),
  answers: answersSchema.default({}),
  consent: z.literal(true, 'Please confirm the organisation can contact you'),
});
export type ApplyInput = z.input<typeof applyInput>;

export const applyResponseSchema = z.object({ ok: z.literal(true) });

// ---------- applications (review) ----------

export const APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: 'Waiting for review',
  APPROVED: 'Approved',
  REJECTED: 'Declined',
};

export const applicationSchema = z.object({
  id: z.string(),
  status: z.enum(APPLICATION_STATUSES),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
  opportunity: z.object({ id: z.string(), title: z.string() }),
  reviewNote: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  // The volunteer record created or matched on approval, if any.
  volunteerId: z.string().nullable(),
  createdAt: z.string(),
});
export type Application = z.infer<typeof applicationSchema>;

export const applicationListQuery = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  opportunityId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ApplicationListQuery = Partial<z.infer<typeof applicationListQuery>>;

export const applicationListSchema = z.object({
  items: z.array(applicationSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  pendingTotal: z.number(),
});
export type ApplicationList = z.infer<typeof applicationListSchema>;

export const reviewInput = z.object({
  note: optionalText(1000),
});
export type ReviewInput = z.input<typeof reviewInput>;
