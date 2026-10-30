import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import type { ApplicationListQuery, ApplyInput, DiscoverQuery, OpportunityInput, ReviewInput } from './recruitment';
import type { AssignInput, CancelInput, EventInput, EventListQuery, ShiftInput } from './schedule';
import type {
  DepartmentInput,
  InviteStaffInput,
  LocationInput,
  UpdateOrganizationInput,
  UpdateStaffInput,
  UpdateVolunteerInput,
  VolunteerInput,
  VolunteerListQuery,
} from './schemas';

// Every key starts with the active organisation so switching organisations never shows stale data.
function useOrgKey() {
  return useAuth().user?.organization?.id ?? 'none';
}

export const queryKeys = {
  organization: (org: string) => [org, 'organization'] as const,
  locations: (org: string) => [org, 'locations'] as const,
  departments: (org: string) => [org, 'departments'] as const,
  team: (org: string) => [org, 'team'] as const,
  volunteers: (org: string) => [org, 'volunteers'] as const,
  volunteerList: (org: string, q: VolunteerListQuery) => [org, 'volunteers', 'list', q] as const,
  volunteer: (org: string, id: string) => [org, 'volunteers', 'detail', id] as const,
  opportunities: (org: string) => [org, 'opportunities'] as const,
  opportunity: (org: string, id: string) => [org, 'opportunities', id] as const,
  applications: (org: string) => [org, 'applications'] as const,
  applicationList: (org: string, q: ApplicationListQuery) => [org, 'applications', 'list', q] as const,
  application: (org: string, id: string) => [org, 'applications', 'detail', id] as const,
  events: (org: string) => [org, 'events'] as const,
  eventList: (org: string, q: EventListQuery) => [org, 'events', 'list', q] as const,
  event: (org: string, id: string) => [org, 'events', 'detail', id] as const,
  coverCandidates: (org: string, shiftId: string) => [org, 'events', 'cover', shiftId] as const,
  me: (org: string) => [org, 'me'] as const,
  openShifts: (org: string) => [org, 'me', 'open-shifts'] as const,
  myShifts: (org: string) => [org, 'me', 'shifts'] as const,
  discover: (q: DiscoverQuery) => ['public', 'discover', q] as const,
  publicOpportunity: (id: string) => ['public', 'opportunity', id] as const,
  publicOrganization: (slug: string) => ['public', 'organization', slug] as const,
};

export function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

// ---------- organisation ----------

export function useOrganization() {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.organization(useOrgKey()), queryFn: api.getOrganization });
}

export function useUpdateOrganization() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) => api.updateOrganization(input),
    onSuccess: (data) => qc.setQueryData(queryKeys.organization(org), data),
  });
}

// ---------- locations & departments ----------

export function useLocations() {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.locations(useOrgKey()), queryFn: api.listLocations });
}

export function useSaveLocation() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: LocationInput }) =>
      id ? api.updateLocation(id, input) : api.createLocation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.locations(org) }),
  });
}

export function useDeleteLocation() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: (id: string) => api.deleteLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.locations(org) }),
  });
}

export function useDepartments() {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.departments(useOrgKey()), queryFn: api.listDepartments });
}

export function useSaveDepartment() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: DepartmentInput }) =>
      id ? api.updateDepartment(id, input) : api.createDepartment(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.departments(org) }),
  });
}

export function useDeleteDepartment() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: (id: string) => api.deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.departments(org) });
      qc.invalidateQueries({ queryKey: queryKeys.volunteers(org) });
    },
  });
}

// ---------- team ----------

export function useTeam() {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.team(useOrgKey()), queryFn: api.listTeam });
}

export function useInviteStaff() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: (input: InviteStaffInput) => api.inviteStaff(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team(org) }),
  });
}

export function useUpdateStaff() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStaffInput }) => api.updateStaff(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team(org) }),
  });
}

export function useRemoveStaff() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: (id: string) => api.removeStaff(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team(org) }),
  });
}

// ---------- volunteers ----------

export function useVolunteers(query: VolunteerListQuery) {
  const { api } = useAuth();
  return useQuery({
    queryKey: queryKeys.volunteerList(useOrgKey(), query),
    queryFn: () => api.listVolunteers(query),
    placeholderData: keepPreviousData,
  });
}

export function useVolunteer(id: string | undefined) {
  const { api } = useAuth();
  return useQuery({
    queryKey: queryKeys.volunteer(useOrgKey(), id ?? ''),
    queryFn: () => api.getVolunteer(id!),
    enabled: !!id,
  });
}

export function useCreateVolunteer() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: (input: VolunteerInput) => api.createVolunteer(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.volunteers(org) });
      qc.invalidateQueries({ queryKey: queryKeys.departments(org) });
    },
  });
}

export function useUpdateVolunteer() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVolunteerInput }) => api.updateVolunteer(id, input),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.volunteer(org, data.id), data);
      qc.invalidateQueries({ queryKey: queryKeys.volunteers(org) });
      qc.invalidateQueries({ queryKey: queryKeys.departments(org) });
    },
  });
}

export function useDeleteVolunteer() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: (id: string) => api.deleteVolunteer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.volunteers(org) });
      qc.invalidateQueries({ queryKey: queryKeys.departments(org) });
    },
  });
}

export function useImportVolunteers() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: api.importVolunteers,
    onSuccess: (res) => {
      if (!res.dryRun) {
        qc.invalidateQueries({ queryKey: queryKeys.volunteers(org) });
        qc.invalidateQueries({ queryKey: queryKeys.departments(org) });
      }
    },
  });
}

// ---------- public recruitment (no sign-in) ----------

export function useDiscover(query: DiscoverQuery) {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.discover(query), queryFn: () => api.discover(query), placeholderData: keepPreviousData });
}

export function usePublicOpportunity(id: string | undefined) {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.publicOpportunity(id ?? ''), queryFn: () => api.publicOpportunity(id!), enabled: !!id, retry: false });
}

export function usePublicOrganization(slug: string | undefined) {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.publicOrganization(slug ?? ''), queryFn: () => api.publicOrganization(slug!), enabled: !!slug, retry: false });
}

export function useApply() {
  const { api } = useAuth();
  return useMutation({ mutationFn: ({ opportunityId, input }: { opportunityId: string; input: ApplyInput }) => api.apply(opportunityId, input) });
}

// ---------- opportunities (coordinators) ----------

export function useOpportunities() {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.opportunities(useOrgKey()), queryFn: api.listOpportunities });
}

export function useOpportunity(id: string | undefined) {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.opportunity(useOrgKey(), id ?? ''), queryFn: () => api.getOpportunity(id!), enabled: !!id });
}

export function useSaveOpportunity() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: OpportunityInput }) => (id ? api.updateOpportunity(id, input) : api.createOpportunity(input)),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.opportunity(org, data.id), data);
      qc.invalidateQueries({ queryKey: queryKeys.opportunities(org), exact: true });
      qc.invalidateQueries({ queryKey: ['public'] });
    },
  });
}

export function useDeleteOpportunity() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: (id: string) => api.deleteOpportunity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.opportunities(org) });
      qc.invalidateQueries({ queryKey: queryKeys.applications(org) });
      qc.invalidateQueries({ queryKey: ['public'] });
    },
  });
}

// ---------- applications (coordinators) ----------

export function useApplications(query: ApplicationListQuery) {
  const { api } = useAuth();
  return useQuery({
    queryKey: queryKeys.applicationList(useOrgKey(), query),
    queryFn: () => api.listApplications(query),
    placeholderData: keepPreviousData,
  });
}

export function useApplication(id: string | undefined) {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.application(useOrgKey(), id ?? ''), queryFn: () => api.getApplication(id!), enabled: !!id });
}

export function useReviewApplication() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  return useMutation({
    mutationFn: ({ id, decision, input }: { id: string; decision: 'approve' | 'reject'; input?: ReviewInput }) =>
      decision === 'approve' ? api.approveApplication(id, input) : api.rejectApplication(id, input),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.application(org, data.id), data);
      qc.invalidateQueries({ queryKey: queryKeys.applications(org) });
      qc.invalidateQueries({ queryKey: queryKeys.opportunities(org) });
      qc.invalidateQueries({ queryKey: queryKeys.volunteers(org) });
      qc.invalidateQueries({ queryKey: queryKeys.departments(org) });
    },
  });
}

// ---------- events & shifts (coordinators) ----------

export function useEvents(query: EventListQuery) {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.eventList(useOrgKey(), query), queryFn: () => api.listEvents(query), placeholderData: keepPreviousData });
}

export function useEvent(id: string | undefined) {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.event(useOrgKey(), id ?? ''), queryFn: () => api.getEvent(id!), enabled: !!id });
}

// Any rota change can move people between lists, so refresh both the coordinator and volunteer views.
function useInvalidateSchedule() {
  const qc = useQueryClient();
  const org = useOrgKey();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.events(org) });
    qc.invalidateQueries({ queryKey: queryKeys.me(org) });
  };
}

export function useSaveEvent() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: EventInput }) => (id ? api.updateEvent(id, input) : api.createEvent(input)),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.event(org, data.id), data);
      invalidate();
    },
  });
}

export function useCancelEvent() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const org = useOrgKey();
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: CancelInput }) => api.cancelEvent(id, input),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.event(org, data.id), data);
      invalidate();
    },
  });
}

export function useDeleteEvent() {
  const { api } = useAuth();
  const invalidate = useInvalidateSchedule();
  return useMutation({ mutationFn: (id: string) => api.deleteEvent(id), onSuccess: invalidate });
}

// Shift-level changes refetch the event so its totals, rosters and the volunteer views stay in step.
function useScheduleMutation<V, R>(fn: (vars: V) => Promise<R>) {
  const invalidate = useInvalidateSchedule();
  return useMutation({ mutationFn: fn, onSuccess: invalidate });
}

export function useSaveShift() {
  const { api } = useAuth();
  return useScheduleMutation(({ eventId, id, input }: { eventId: string; id?: string; input: ShiftInput }) =>
    id ? api.updateShift(id, input) : api.createShift(eventId, input),
  );
}

export function useDeleteShift() {
  const { api } = useAuth();
  return useScheduleMutation((id: string) => api.deleteShift(id));
}

export function useAssignToShift() {
  const { api } = useAuth();
  return useScheduleMutation(({ shiftId, input }: { shiftId: string; input: AssignInput }) => api.assignToShift(shiftId, input));
}

export function useRemoveAssignment() {
  const { api } = useAuth();
  return useScheduleMutation(({ id, input }: { id: string; input?: CancelInput }) => api.removeAssignment(id, input));
}

export function useCoverCandidates(shiftId: string | undefined) {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.coverCandidates(useOrgKey(), shiftId ?? ''), queryFn: () => api.coverCandidates(shiftId!), enabled: !!shiftId });
}

// ---------- my shifts (volunteers) ----------

export function useOpenShifts() {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.openShifts(useOrgKey()), queryFn: api.openShifts });
}

export function useMyShifts() {
  const { api } = useAuth();
  return useQuery({ queryKey: queryKeys.myShifts(useOrgKey()), queryFn: api.myShifts });
}

export function useSignUpForShift() {
  const { api } = useAuth();
  return useScheduleMutation((shiftId: string) => api.signUpForShift(shiftId));
}

export function useCancelMyShift() {
  const { api } = useAuth();
  return useScheduleMutation(({ shiftId, input }: { shiftId: string; input?: CancelInput }) => api.cancelMyShift(shiftId, input));
}
