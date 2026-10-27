import { useAuth } from '@newreplica/shared/auth';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { VolunteerForm } from '@/features/VolunteerForm';

export default function EditVolunteerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  if (!can('volunteers:manage')) return <Redirect href="/home" />;
  return <VolunteerForm key={id} id={id} />;
}
