import {
  DAY_PARTS,
  DAY_PART_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  hasAvailability,
  toggleAvailability,
  type Availability,
  type Department,
} from '@newreplica/shared';
import { useState } from 'react';
import { icons } from './icons';

export function AvailabilityGrid({ value, onChange }: { value: Availability; onChange: (v: Availability) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">Availability</legend>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="w-24" />
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col" className="pb-1 text-xs font-semibold text-muted">
                  {WEEKDAY_LABELS[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_PARTS.map((part) => (
              <tr key={part}>
                <th scope="row" className="pr-2 text-left text-xs font-medium text-muted">
                  {DAY_PART_LABELS[part]}
                </th>
                {WEEKDAYS.map((day) => {
                  const on = hasAvailability(value, day, part);
                  return (
                    <td key={day}>
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${WEEKDAY_LABELS[day]} ${DAY_PART_LABELS[part]}`}
                        onClick={() => onChange(toggleAvailability(value, day, part))}
                        className={`grid h-9 w-full place-items-center rounded-lg border transition active:translate-y-px ${
                          on ? 'border-brand bg-brand text-white shadow-dx-sm' : 'border-line bg-white text-transparent hover:border-line-strong'
                        }`}
                      >
                        <icons.check size={14} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}

export function SkillsInput({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft('');
  };
  return (
    <div>
      <label htmlFor="skills" className="mb-1.5 block text-sm font-medium text-ink">
        Skills
      </label>
      <div
        className={`flex flex-wrap gap-1.5 rounded-lg border bg-white px-2 py-2 shadow-dx-sm focus-within:ring-4 ${
          error ? 'border-brand focus-within:ring-brand/20' : 'border-line focus-within:border-ink/40 focus-within:ring-ink/10'
        }`}
      >
        {value.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-navy-soft py-0.5 pr-1 pl-2.5 text-sm text-ink">
            {s}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== s))}
              className="grid h-5 w-5 place-items-center rounded-full hover:bg-line-strong"
              aria-label={`Remove ${s}`}
            >
              <icons.x size={12} />
            </button>
          </span>
        ))}
        <input
          id="skills"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={add}
          placeholder={value.length ? '' : 'First aid, Driving…'}
          className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-ink outline-none placeholder:text-faint"
        />
      </div>
      {error ? <p className="mt-1.5 text-sm text-brand">{error}</p> : <p className="mt-1.5 text-sm text-muted">Press Enter or comma to add.</p>}
    </div>
  );
}

export function DepartmentPicker({
  departments,
  value,
  onChange,
}: {
  departments: Department[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">Departments</legend>
      {departments.length === 0 ? (
        <p className="text-sm text-muted">No departments yet. Add them in Organisation settings.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {departments.map((d) => {
            const on = value.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? value.filter((x) => x !== d.id) : [...value, d.id])}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition active:translate-y-px ${
                  on ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-text hover:border-line-strong'
                }`}
              >
                {on && <icons.check size={14} />}
                {d.name}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
