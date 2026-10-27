import { HEX_COLOR, updateOrganizationInput, type OrganizationSettings } from '@newreplica/shared';
import { useOrganization, useUpdateOrganization } from '@newreplica/shared/queries';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { icons } from '../../components/icons';
import { Field, FormError, Select, Spinner, TextArea, fieldErrors } from '../../components/ui';

type Form = Record<'name' | 'contactEmail' | 'phone' | 'website' | 'description' | 'timezone' | 'brandColor' | 'logoUrl', string>;

function toForm(o: OrganizationSettings): Form {
  return {
    name: o.name,
    contactEmail: o.contactEmail ?? '',
    phone: o.phone ?? '',
    website: o.website ?? '',
    description: o.description ?? '',
    timezone: o.timezone,
    brandColor: o.brandColor,
    logoUrl: o.logoUrl ?? '',
  };
}

function useTimezones(current: string) {
  return useMemo(() => {
    const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    return all.includes(current) || !current ? all : [current, ...all];
  }, [current]);
}

export function ProfileTab() {
  const org = useOrganization();
  const update = useUpdateOrganization();
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);
  const timezones = useTimezones(form?.timezone ?? '');

  useEffect(() => {
    if (org.data) setForm(toForm(org.data));
  }, [org.data]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  if (org.isError) return <FormError error={org.error} />;
  if (!form) return <div className="skeleton h-96" />;

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((f) => f && { ...f, [key]: e.target.value });
  const validColor = HEX_COLOR.test(form.brandColor);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { data, errors } = fieldErrors(updateOrganizationInput, form);
    setErrors(errors);
    if (data) update.mutate(data, { onSuccess: () => setSaved(true) });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">Profile</h2>
        <Field label="Organisation name" value={form.name} onChange={set('name')} error={errors?.name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact email" type="email" value={form.contactEmail} onChange={set('contactEmail')} error={errors?.contactEmail} />
          <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors?.phone} />
          <Field label="Website" type="url" placeholder="https://" value={form.website} onChange={set('website')} error={errors?.website} />
          <Select label="Time zone" value={form.timezone} onChange={set('timezone')} error={errors?.timezone} hint="Shift times are shown in this time zone.">
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        <TextArea
          label="About"
          hint="Shown to volunteers on your public opportunities page."
          value={form.description}
          onChange={set('description')}
          error={errors?.description}
        />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">Branding</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <div>
            <label htmlFor="brand-color" className="mb-1.5 block text-sm font-medium text-ink">
              Brand colour
            </label>
            <div className="flex gap-2">
              <input
                id="brand-color-picker"
                type="color"
                aria-label="Pick brand colour"
                value={validColor ? form.brandColor : '#c7102c'}
                onChange={set('brandColor')}
                className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-white p-1"
              />
              <input
                id="brand-color"
                value={form.brandColor}
                onChange={set('brandColor')}
                className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-ink shadow-dx-sm focus:outline-none focus-visible:ring-4 ${
                  errors?.brandColor ? 'border-brand focus-visible:ring-brand/20' : 'border-line focus-visible:ring-ink/10'
                }`}
              />
            </div>
            {errors?.brandColor && <p className="mt-1.5 text-sm text-brand">{errors.brandColor}</p>}
          </div>
          <Field label="Logo URL" type="url" placeholder="https://…/logo.png" value={form.logoUrl} onChange={set('logoUrl')} error={errors?.logoUrl} />
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">Preview</p>
          <div className="mt-3 flex items-center gap-3">
            {form.logoUrl && /^https?:\/\//.test(form.logoUrl) ? (
              <img src={form.logoUrl} alt="" className="h-10 w-10 rounded-lg border border-line bg-white object-contain" />
            ) : (
              <span
                className="grid h-10 w-10 place-items-center rounded-lg font-bold text-white"
                style={{ backgroundColor: validColor ? form.brandColor : '#c7102c' }}
              >
                {form.name.trim().charAt(0).toUpperCase() || 'R'}
              </span>
            )}
            <span className="font-semibold text-ink">{form.name || 'Your organisation'}</span>
            <span
              className="ml-auto rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
              style={{ backgroundColor: validColor ? form.brandColor : '#c7102c' }}
            >
              Sign up
            </span>
          </div>
          <p className="mt-3 text-xs text-muted">Your colour and logo are used on pages volunteers see, such as your public opportunities page.</p>
        </div>
      </section>

      <FormError error={update.error} />
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex animate-fade-up items-center gap-1.5 text-sm font-medium text-success">
            <icons.check size={16} /> Saved
          </span>
        )}
        <button type="submit" className="btn-primary" disabled={update.isPending}>
          {update.isPending && <Spinner />}
          Save changes
        </button>
      </div>
    </form>
  );
}
