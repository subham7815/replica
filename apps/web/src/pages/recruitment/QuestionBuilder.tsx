import { QUESTION_TYPES, QUESTION_TYPE_LABELS, newQuestionId, type Question, type QuestionType } from '@newreplica/shared';
import { icons } from '../../components/icons';

export function QuestionBuilder({
  value,
  onChange,
  error,
}: {
  value: Question[];
  onChange: (q: Question[]) => void;
  error?: string;
}) {
  const update = (i: number, patch: Partial<Question>) => onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    const [item] = next.splice(i, 1);
    next.splice(i + dir, 0, item!);
    onChange(next);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Application questions</h2>
          <p className="text-sm text-muted">Name, email and phone are always asked. Add anything else you need to know.</p>
        </div>
      </div>
      <ol className="space-y-3">
        {value.map((q, i) => (
          <li key={q.id} className="animate-fade-up rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start gap-3">
              <span className="mt-2.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
              <input
                aria-label={`Question ${i + 1}`}
                value={q.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="e.g. Do you have a DBS check?"
                className="min-w-48 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/10"
              />
              <select
                aria-label="Answer type"
                value={q.type}
                onChange={(e) => {
                  const type = e.target.value as QuestionType;
                  update(i, { type, options: type === 'select' ? (q.options?.length ? q.options : ['', '']) : undefined });
                }}
                className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/10"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            {q.type === 'select' && (
              <div className="mt-3 ml-9">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Options, one per line</span>
                  <textarea
                    rows={3}
                    value={(q.options ?? []).join('\n')}
                    onChange={(e) => update(i, { options: e.target.value.split('\n') })}
                    onBlur={() => update(i, { options: (q.options ?? []).map((o) => o.trim()).filter(Boolean) })}
                    className="block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/10"
                  />
                </label>
              </div>
            )}
            <div className="mt-3 ml-9 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} className="h-4 w-4 accent-brand" />
                Required
              </label>
              <div className="flex gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-white disabled:opacity-30" aria-label="Move up">
                  ↑
                </button>
                <button
                  type="button"
                  disabled={i === value.length - 1}
                  onClick={() => move(i, 1)}
                  className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-white disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="rounded-lg px-2 py-1 text-sm text-brand hover:bg-brand-soft"
                  aria-label="Remove question"
                >
                  <icons.x size={16} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {error && <p className="mt-2 text-sm text-brand">{error}</p>}
      <button
        type="button"
        disabled={value.length >= 15}
        onClick={() => onChange([...value, { id: newQuestionId(), label: '', type: 'text', required: false }])}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand/40 hover:text-brand"
      >
        + Add question
      </button>
    </div>
  );
}
