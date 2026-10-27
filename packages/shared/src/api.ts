import { z } from 'zod';
import {
  applicationListSchema,
  applicationSchema,
  applyResponseSchema,
  opportunitySchema,
  publicOpportunityListSchema,
  publicOpportunitySchema,
  publicOrganizationPageSchema,
  type ApplicationListQuery,
  type ApplyInput,
  type DiscoverQuery,
  type OpportunityInput,
  type ReviewInput,
} from './recruitment';
import {
  authResponseSchema,
  departmentSchema,
  healthSchema,
  importResultSchema,
  locationSchema,
  organizationSettingsSchema,
  requestCodeResponseSchema,
  teamMemberSchema,
  userSchema,
  volunteerListSchema,
  volunteerSchema,
  type DepartmentInput,
  type ImportVolunteersInput,
  type InviteStaffInput,
  type LocationInput,
  type LoginInput,
  type RegisterOrganizationInput,
  type RequestCodeInput,
  type UpdateOrganizationInput,
  type UpdateStaffInput,
  type UpdateVolunteerInput,
  type VerifyCodeInput,
  type VolunteerInput,
  type VolunteerListQuery,
} from './schemas';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const ORG_HEADER = 'X-Organization-Id';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  getOrganizationId?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

const ok = z.object({ ok: z.literal(true) });

function toQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export function createApiClient({ baseUrl, getToken, getOrganizationId, onUnauthorized }: ApiClientOptions) {
  async function send(path: string, init: RequestInit = {}): Promise<Response> {
    const [token, orgId] = await Promise.all([getToken?.() ?? null, getOrganizationId?.() ?? null]);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(orgId ? { [ORG_HEADER]: orgId } : {}),
          ...init.headers,
        },
      });
    } catch {
      throw new ApiError(0, 'Could not reach the server. Check your connection.');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (res.status === 401 && token) onUnauthorized?.();
      throw new ApiError(res.status, body?.error ?? res.statusText);
    }
    return res;
  }

  async function request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    const res = await send(path, init);
    return schema.parse(await res.json());
  }

  const body = (method: string) => <T>(path: string, schema: z.ZodType<T>, data?: unknown) =>
    request(path, schema, { method, body: data === undefined ? undefined : JSON.stringify(data) });
  const post = body('POST');
  const patch = body('PATCH');
  const del = <T>(path: string, schema: z.ZodType<T>) => request(path, schema, { method: 'DELETE' });

  return {
    health: () => request('/health', healthSchema),

    login: (input: LoginInput) => post('/auth/login', authResponseSchema, input),
    registerOrganization: (input: RegisterOrganizationInput) =>
      post('/auth/register-organization', authResponseSchema, input),
    requestCode: (input: RequestCodeInput) => post('/auth/request-code', requestCodeResponseSchema, input),
    verifyCode: (input: VerifyCodeInput) => post('/auth/verify-code', authResponseSchema, input),
    me: () => request('/auth/me', z.object({ user: userSchema })).then((r) => r.user),

    getOrganization: () => request('/organization', organizationSettingsSchema),
    updateOrganization: (input: UpdateOrganizationInput) => patch('/organization', organizationSettingsSchema, input),

    listLocations: () => request('/locations', z.array(locationSchema)),
    createLocation: (input: LocationInput) => post('/locations', locationSchema, input),
    updateLocation: (id: string, input: LocationInput) => patch(`/locations/${id}`, locationSchema, input),
    deleteLocation: (id: string) => del(`/locations/${id}`, ok),

    listDepartments: () => request('/departments', z.array(departmentSchema)),
    createDepartment: (input: DepartmentInput) => post('/departments', departmentSchema, input),
    updateDepartment: (id: string, input: DepartmentInput) => patch(`/departments/${id}`, departmentSchema, input),
    deleteDepartment: (id: string) => del(`/departments/${id}`, ok),

    listTeam: () => request('/team', z.array(teamMemberSchema)),
    inviteStaff: (input: InviteStaffInput) => post('/team', teamMemberSchema, input),
    updateStaff: (id: string, input: UpdateStaffInput) => patch(`/team/${id}`, teamMemberSchema, input),
    removeStaff: (id: string) => del(`/team/${id}`, ok),

    listVolunteers: (query: VolunteerListQuery = {}) =>
      request(`/volunteers${toQuery({ ...query })}`, volunteerListSchema),
    getVolunteer: (id: string) => request(`/volunteers/${id}`, volunteerSchema),
    createVolunteer: (input: VolunteerInput) => post('/volunteers', volunteerSchema, input),
    updateVolunteer: (id: string, input: UpdateVolunteerInput) => patch(`/volunteers/${id}`, volunteerSchema, input),
    deleteVolunteer: (id: string) => del(`/volunteers/${id}`, ok),
    importVolunteers: (input: ImportVolunteersInput) => post('/volunteers/import', importResultSchema, input),
    exportVolunteersCsv: async (query: Omit<VolunteerListQuery, 'page' | 'pageSize'> = {}) =>
      (await send(`/volunteers/export${toQuery({ ...query })}`)).text(),

    discover: (query: DiscoverQuery = {}) => request(`/public/opportunities${toQuery({ ...query })}`, publicOpportunityListSchema),
    publicOpportunity: (id: string) => request(`/public/opportunities/${encodeURIComponent(id)}`, publicOpportunitySchema),
    publicOrganization: (slug: string) => request(`/public/organizations/${encodeURIComponent(slug)}`, publicOrganizationPageSchema),
    apply: (opportunityId: string, input: ApplyInput) =>
      post(`/public/opportunities/${encodeURIComponent(opportunityId)}/apply`, applyResponseSchema, input),

    listOpportunities: () => request('/opportunities', z.array(opportunitySchema)),
    getOpportunity: (id: string) => request(`/opportunities/${id}`, opportunitySchema),
    createOpportunity: (input: OpportunityInput) => post('/opportunities', opportunitySchema, input),
    updateOpportunity: (id: string, input: Partial<OpportunityInput>) => patch(`/opportunities/${id}`, opportunitySchema, input),
    deleteOpportunity: (id: string) => del(`/opportunities/${id}`, ok),

    listApplications: (query: ApplicationListQuery = {}) => request(`/applications${toQuery({ ...query })}`, applicationListSchema),
    getApplication: (id: string) => request(`/applications/${id}`, applicationSchema),
    approveApplication: (id: string, input: ReviewInput = {}) => post(`/applications/${id}/approve`, applicationSchema, input),
    rejectApplication: (id: string, input: ReviewInput = {}) => post(`/applications/${id}/reject`, applicationSchema, input),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
