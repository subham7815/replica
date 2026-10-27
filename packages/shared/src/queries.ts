import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from './auth';
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
