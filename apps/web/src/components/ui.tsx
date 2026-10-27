import { ApiError, MEMBER_STATUS_LABELS, type MemberStatus } from '@newreplica/shared';
import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import type { z } from 'zod';
import { icons } from './icons';

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const controlClass = (error?: string) =>
  `block w-full rounded-lg border bg-white px-3.5 py-2.5 text-ink shadow-dx-sm transition placeholder:text-faint
   focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted ${
     error
       ? 'border-brand focus-visible:ring-brand/20'
       : 'border-line hover:border-line-strong focus-visible:border-ink/40 focus-visible:ring-ink/10'
   }`;

function FieldShell({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-brand">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type FieldProps<T> = T & { label: string; error?: string; hint?: ReactNode };

export function Field({ label, error, hint, className = '', ...props }: FieldProps<InputHTMLAttributes<HTMLInputElement>>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${controlClass(error)} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function TextArea({ label, error, hint, className = '', ...props }: FieldProps<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea id={id} rows={3} aria-invalid={!!error} className={`${controlClass(error)} ${className}`} {...props} />
    </FieldShell>
  );
}

export function Select({
  label,
  error,
  hint,
  className = '',
  children,
  ...props
}: FieldProps<SelectHTMLAttributes<HTMLSelectElement>>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <select id={id} aria-invalid={!!error} className={`${controlClass(error)} pr-9 ${className}`} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
  return (
    <div role="alert" className="animate-fade-up rounded-lg border border-brand/20 bg-brand-soft px-3.5 py-2.5 text-sm text-brand-deep">
      {message}
    </div>
  );
}

export function fieldErrors<T>(schema: z.ZodType<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, errors: null };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '_');
    errors[key] ??= issue.message;
  }
  return { data: null, errors };
}

const STATUS_STYLES: Record<MemberStatus, string> = {
  ACTIVE: 'bg-success-soft text-success',
  INVITED: 'bg-warning-soft text-warning',
  INACTIVE: 'bg-navy-soft text-muted',
  SUSPENDED: 'bg-brand-soft text-brand',
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status === 'INVITED' ? 'animate-pulse' : ''}`} />
      {MEMBER_STATUS_LABELS[status]}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line-strong bg-white/60 px-6 py-14 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl border border-line bg-white p-0 text-text shadow-dx-lg backdrop:bg-navy-deep/40 backdrop:backdrop-blur-sm open:animate-fade-up`}
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-navy-soft" onClick={onClose} aria-label="Close">
          <icons.x size={18} />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-line-strong transition peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-dx-sm after:transition-transform peer-checked:after:translate-x-4" />
      {label}
    </label>
  );
}

export function formatDate(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
