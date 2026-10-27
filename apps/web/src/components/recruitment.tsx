import {
  APPLICATION_STATUS_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  type ApplicationStatus,
  type OpportunityStatus,
  type PublicOpportunity,
  type PublicOrganization,
  type Question,
} from '@newreplica/shared';
import { Link } from 'react-router';
import { icons } from './icons';

export function OrgMark({ org, size = 40 }: { org: Pick<PublicOrganization, 'name' | 'logoUrl' | 'brandColor'>; size?: number }) {
  const style = { width: size, height: size };
  return org.logoUrl ? (
    <img src={org.logoUrl} alt="" style={style} className="shrink-0 rounded-xl border border-line bg-white object-contain" />
  ) : (
    <span
      style={{ ...style, backgroundColor: org.brandColor, fontSize: size * 0.42 }}
      className="grid shrink-0 place-items-center rounded-xl font-bold text-white"
      aria-hidden
    >
      {org.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function SignupModeBadge({ mode }: { mode: PublicOpportunity['signupMode'] }) {
  return mode === 'OPEN' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">
      <icons.check size={12} /> Join instantly
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-soft px-2.5 py-0.5 text-xs font-semibold text-navy">
      <icons.note size={12} /> Apply
    </span>
  );
}

export function OpportunityCard({ opp, showOrg = true }: { opp: PublicOpportunity; showOrg?: boolean }) {
  return (
    <Link
      to={`/opportunities/${opp.id}`}
      className="card group flex h-full flex-col p-5 transition duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-dx"
    >
      {showOrg && (
        <div className="mb-4 flex items-center gap-2.5">
          <OrgMark org={opp.organization} size={32} />
          <span className="truncate text-sm font-medium text-muted">{opp.organization.name}</span>
        </div>
      )}
      <h3 className="text-lg font-semibold group-hover:text-brand">{opp.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed">{opp.summary}</p>
      <div className="mt-auto space-y-1.5 pt-5 text-xs text-muted">
        {opp.commitment && (
          <p className="flex items-center gap-1.5">
            <icons.clock size={14} /> {opp.commitment}
          </p>
        )}
        {opp.location && (
          <p className="flex items-center gap-1.5">
            <icons.calendar size={14} /> {opp.location.name}
            {opp.location.address ? `, ${opp.location.address}` : ''}
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-4">
        <SignupModeBadge mode={opp.signupMode} />
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
          View <icons.arrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

export function QuestionField({
  question,
  value,
  onChange,
  error,
}: {
  question: Question;
  value: string | boolean | undefined;
  onChange: (v: string | boolean | undefined) => void;
  error?: string;
}) {
  const id = `q-${question.id}`;
  const label = (
    <span className="mb-1.5 block text-sm font-medium text-ink">
      {question.label}
      {question.required && <span className="text-brand"> *</span>}
    </span>
  );
  const control = `block w-full rounded-lg border bg-white px-3.5 py-2.5 text-ink shadow-dx-sm transition focus:outline-none focus-visible:ring-4 ${
    error ? 'border-brand focus-visible:ring-brand/20' : 'border-line hover:border-line-strong focus-visible:border-ink/40 focus-visible:ring-ink/10'
  }`;

  return (
    <div>
      {question.type === 'yesno' ? (
        <fieldset>
          <legend>{label}</legend>
          <div className="flex gap-2">
            {[
              [true, 'Yes'],
              [false, 'No'],
            ].map(([v, text]) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={value === v}
                onClick={() => onChange(v as boolean)}
                className={`rounded-lg border px-5 py-2 text-sm font-medium transition active:translate-y-px ${
                  value === v ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-text hover:border-line-strong'
                }`}
              >
                {text as string}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <label htmlFor={id} className="block">
          {label}
          {question.type === 'textarea' ? (
            <textarea id={id} rows={4} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={control} />
          ) : question.type === 'select' ? (
            <select id={id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className={control}>
              <option value="">Choose…</option>
              {question.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input id={id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={control} />
          )}
        </label>
      )}
      {error && <p className="mt-1.5 text-sm text-brand">{error}</p>}
    </div>
  );
}

const OPP_STATUS_STYLE: Record<OpportunityStatus, string> = {
  DRAFT: 'bg-navy-soft text-muted',
  PUBLISHED: 'bg-success-soft text-success',
  CLOSED: 'bg-line-soft text-muted',
};

export function OpportunityStatusBadge({ status }: { status: OpportunityStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${OPP_STATUS_STYLE[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {OPPORTUNITY_STATUS_LABELS[status]}
    </span>
  );
}

const APP_STATUS_STYLE: Record<ApplicationStatus, string> = {
  PENDING: 'bg-warning-soft text-warning',
  APPROVED: 'bg-success-soft text-success',
  REJECTED: 'bg-navy-soft text-muted',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${APP_STATUS_STYLE[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status === 'PENDING' ? 'animate-pulse' : ''}`} />
      {APPLICATION_STATUS_LABELS[status]}
    </span>
  );
}
