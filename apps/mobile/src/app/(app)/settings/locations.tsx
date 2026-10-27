import { locationInput } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useDeleteLocation, useLocations, useSaveLocation } from '@newreplica/shared/queries';
import { Redirect } from 'expo-router';
import { PlacesList } from '@/features/PlacesList';

export default function LocationsScreen() {
  const { can } = useAuth();
  const query = useLocations();
  const save = useSaveLocation();
  const remove = useDeleteLocation();
  if (!can('org:manage')) return <Redirect href="/home" />;

  return (
    <PlacesList
      intro="Places where shifts happen."
      noun="location"
      emptyBody="Add the halls, warehouses or venues where your volunteers work."
      query={query}
      schema={locationInput}
      fields={[
        { key: 'name', label: 'Name' },
        { key: 'address', label: 'Address' },
        { key: 'notes', label: 'Notes', multiline: true, hint: 'Parking, access codes, where to report…' },
      ]}
      toValues={(l) => ({ name: l?.name ?? '', address: l?.address ?? '', notes: l?.notes ?? '' })}
      subtitle={(l) => l.address}
      save={save}
      remove={remove}
    />
  );
}
