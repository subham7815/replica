import { HEX_COLOR, colors, radii, spacing, updateOrganizationInput, type OrganizationSettings } from '@newreplica/shared';
import { useAuth } from '@newreplica/shared/auth';
import { useOrganization, useUpdateOrganization } from '@newreplica/shared/queries';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { SavedNote } from '@/components/kit';
import { Screen } from '@/components/Screen';
import { Button, Card, Field, FormError, fieldErrors, text } from '@/components/ui';

type Form = Record<'name' | 'contactEmail' | 'phone' | 'website' | 'description' | 'timezone' | 'brandColor' | 'logoUrl', string>;

const toForm = (o: OrganizationSettings): Form => ({
  name: o.name,
  contactEmail: o.contactEmail ?? '',
  phone: o.phone ?? '',
  website: o.website ?? '',
  description: o.description ?? '',
  timezone: o.timezone,
  brandColor: o.brandColor,
  logoUrl: o.logoUrl ?? '',
});

const SWATCHES = ['#c7102c', '#23252e', '#15803d', '#1d4ed8', '#7c3aed', '#c2410c', '#0f766e', '#be185d'];

export default function ProfileScreen() {
  const { can } = useAuth();
  const org = useOrganization();
  const update = useUpdateOrganization();
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (org.data) setForm(toForm(org.data));
  }, [org.data]);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  if (!can('org:manage')) return <Redirect href="/home" />;
  if (org.isError) {
    return (
      <Screen edges={['bottom']}>
        <FormError error={org.error} />
      </Screen>
    );
  }
  if (!form) {
    return (
      <Screen edges={['bottom']}>
        <ActivityIndicator color={colors.red} />
      </Screen>
    );
  }

  const set = (key: keyof Form) => (v: string) => setForm((f) => f && { ...f, [key]: v });
  const color = HEX_COLOR.test(form.brandColor) ? form.brandColor : colors.red;

  function submit() {
    const { data, errors } = fieldErrors(updateOrganizationInput, form);
    setErrors(errors);
    if (data) update.mutate(data, { onSuccess: () => setSaved(true) });
  }

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: spacing.lg }}>
        <Field label="Organisation name" value={form.name} onChangeText={set('name')} error={errors?.name} />
        <Field label="Contact email" value={form.contactEmail} onChangeText={set('contactEmail')} keyboardType="email-address" autoCapitalize="none" error={errors?.contactEmail} />
        <Field label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors?.phone} />
        <Field label="Website" value={form.website} onChangeText={set('website')} autoCapitalize="none" keyboardType="url" placeholder="https://" error={errors?.website} />
        <Field
          label="Time zone"
          value={form.timezone}
          onChangeText={set('timezone')}
          autoCapitalize="none"
          hint="For example Europe/London"
          error={errors?.timezone}
        />
        <Field label="About" value={form.description} onChangeText={set('description')} multiline error={errors?.description} />
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <Text style={{ color: colors.ink, fontWeight: '600' }}>Branding</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {SWATCHES.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`Use colour ${c}`}
              accessibilityState={{ selected: form.brandColor.toLowerCase() === c }}
              onPress={() => set('brandColor')(c)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: c,
                borderWidth: form.brandColor.toLowerCase() === c ? 3 : 0,
                borderColor: colors.ink,
              }}
            />
          ))}
        </View>
        <Field label="Brand colour" value={form.brandColor} onChangeText={set('brandColor')} autoCapitalize="none" error={errors?.brandColor} />
        <Field label="Logo URL" value={form.logoUrl} onChangeText={set('logoUrl')} autoCapitalize="none" keyboardType="url" error={errors?.logoUrl} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radii.md }}>
          {form.logoUrl.startsWith('https://') ? (
            <Image source={{ uri: form.logoUrl }} style={{ width: 40, height: 40, borderRadius: 8 }} />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.white, fontWeight: '700' }}>{form.name.trim().charAt(0).toUpperCase() || 'R'}</Text>
            </View>
          )}
          <Text style={{ flex: 1, color: colors.ink, fontWeight: '600' }} numberOfLines={1}>
            {form.name || 'Your organisation'}
          </Text>
          <View style={{ backgroundColor: color, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: colors.white, fontWeight: '600' }}>Sign up</Text>
          </View>
        </View>
        <Text style={text.muted}>Used on pages volunteers see, like your public opportunities page.</Text>
      </Card>

      <FormError error={update.error} />
      <SavedNote visible={saved} />
      <Button title="Save changes" onPress={submit} loading={update.isPending} />
    </Screen>
  );
}
