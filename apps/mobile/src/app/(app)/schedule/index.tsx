import { colors, formatDay, spacing, type EventScope } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useEvents } from '@newreplica/shared/queries';
import { Redirect, Stack, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ChipGroup, EmptyState } from '@/components/kit';
import { EventStatusBadge, FillBar, PlacesLabel, Tag } from '@/components/schedule';
import { Screen } from '@/components/Screen';
import { Button, Card, FormError, text } from '@/components/ui';

function dateRange(startsAt: string | null, endsAt: string | null, tz: string) {
  if (!startsAt || !endsAt) return 'No shifts yet';
  const a = formatDay(startsAt, tz);
  const b = formatDay(endsAt, tz);
  return a === b ? a : `${a} – ${b}`;
}

export default function ScheduleScreen() {
  const { can } = useAuth();
  const [scope, setScope] = useState<EventScope>('upcoming');
  const list = useEvents({ scope });
  if (!can('shifts:manage')) return <Redirect href="/home" />;
  const newEvent = () => router.push({ pathname: '/schedule/edit/[id]', params: { id: 'new' } });

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerRight: can('programmes:manage')
            ? () => (
                <Pressable accessibilityRole="button" onPress={newEvent} hitSlop={12}>
                  <Text style={{ color: colors.red, fontWeight: '700', fontSize: 16 }}>+ New</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ChipGroup
        value={scope}
        onChange={setScope}
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Past & cancelled' },
        ]}
      />
      {list.isPending ? (
        <ActivityIndicator color={colors.red} />
      ) : list.isError ? (
        <FormError error={list.error} />
      ) : list.data.length === 0 ? (
        <EmptyState
          title={scope === 'upcoming' ? 'No upcoming events' : 'Nothing here yet'}
          body={scope === 'upcoming' ? 'Create an event, add shifts with the people you need, then publish it.' : 'Finished and cancelled events appear here.'}
        >
          {scope === 'upcoming' && can('programmes:manage') && <Button title="Create your first event" onPress={newEvent} />}
        </EmptyState>
      ) : (
        list.data.map((e) => (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/schedule/[id]', params: { id: e.id } })}
            style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ translateY: 1 }] }]}
          >
            <Card style={{ padding: spacing.lg, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16, flexShrink: 1 }}>{e.title}</Text>
                <EventStatusBadge status={e.status} />
              </View>
              <Text style={[text.body, { fontSize: 14 }]}>
                {dateRange(e.startsAt, e.endsAt, e.timezone)}
                {e.location ? ` · ${e.location.name}` : ''}
              </Text>
              <FillBar confirmed={e.confirmedCount} capacity={e.capacity} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <PlacesLabel confirmed={e.confirmedCount} capacity={e.capacity} waitlist={e.waitlistCount} />
                <Text style={text.muted}>
                  {e.shiftCount} shift{e.shiftCount === 1 ? '' : 's'}
                </Text>
              </View>
              {e.openSpots > 0 && e.status === 'PUBLISHED' && <Tag tone="red" label={`${e.openSpots} place${e.openSpots === 1 ? '' : 's'} to fill`} />}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
