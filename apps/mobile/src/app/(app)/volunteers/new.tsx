import { useAuth } from '@newreplica/shared/auth';
import { Redirect } from 'expo-router';
import { VolunteerForm } from '@/features/VolunteerForm';

export default function NewVolunteerScreen() {
  const { can } = useAuth();
  if (!can('volunteers:manage')) return <Redirect href="/home" />;
  return <VolunteerForm />;
}
