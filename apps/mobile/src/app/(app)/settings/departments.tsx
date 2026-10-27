import { colors, departmentInput, radii } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useDeleteDepartment, useDepartments, useSaveDepartment } from '@newreplica/shared/queries';
import { Redirect } from 'expo-router';
import { Text } from 'react-native';
import { PlacesList } from '@/features/PlacesList';

export default function DepartmentsScreen() {
  const { can } = useAuth();
  const query = useDepartments();
  const save = useSaveDepartment();
  const remove = useDeleteDepartment();
  if (!can('org:manage')) return <Redirect href="/home" />;

  return (
    <PlacesList
      intro="Group volunteers by team or area of work."
      noun="department"
      emptyBody="For example: Warehouse, Front desk, Deliveries."
      query={query}
      schema={departmentInput}
      fields={[
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description', multiline: true },
      ]}
      toValues={(d) => ({ name: d?.name ?? '', description: d?.description ?? '' })}
      subtitle={(d) => d.description}
      badge={(d) => (
        <Text style={{ backgroundColor: colors.navySoft, color: colors.muted, borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 2, fontSize: 12, overflow: 'hidden' }}>
          {d.memberCount}
        </Text>
      )}
      deleteWarning={(d) => (d.memberCount ? `${d.memberCount} people will be taken out of this department.` : undefined)}
      save={save}
      remove={remove}
    />
  );
}
