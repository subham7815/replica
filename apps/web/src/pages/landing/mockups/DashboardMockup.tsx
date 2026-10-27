import { icons } from '../../../components/icons';
import { useInView } from '../../../hooks/useReveal';

const STATS = [
  { label: 'Shifts this week', value: '14' },
  { label: 'Spots filled', value: '92%' },
  { label: 'Gaps to fill', value: '2', alert: true },
];

const SHIFTS = [
  { day: 'Tue', title: 'Evening packing', filled: 5, need: 5 },
  { day: 'Thu', title: 'Delivery drivers', filled: 2, need: 3 },
  { day: 'Sat', title: 'Food sorting', filled: 6, need: 6 },
  { day: 'Sat', title: 'Distribution', filled: 3, need: 4 },
];

export function DashboardMockup() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-line bg-white shadow-dx-lg" aria-hidden>
      <div className="flex items-center gap-1.5 border-b border-line bg-surface px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 text-xs text-faint">Coordinator dashboard · Sample data</span>
      </div>
      <div className="grid sm:grid-cols-[150px_1fr]">
        <div className="hidden space-y-1 border-r border-line p-3 text-xs font-medium sm:block">
          {['Dashboard', 'Rotas', 'Volunteers', 'Check-in', 'Reports'].map((l, i) => (
            <div key={l} className={`rounded-md px-2.5 py-1.5 ${i === 0 ? 'bg-brand-soft text-brand' : 'text-muted'}`}>
              {l}
            </div>
          ))}
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-line p-3">
                <p className="text-[10px] text-muted sm:text-[11px]">{s.label}</p>
                <p className={`mt-1 text-lg font-bold sm:text-xl ${s.alert ? 'text-brand' : 'text-ink'}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <ul className="mt-4 divide-y divide-line-soft">
            {SHIFTS.map((s, i) => {
              const full = s.filled === s.need;
              return (
                <li key={s.title} className="flex items-center gap-3 py-2.5">
                  <span className="w-8 shrink-0 text-xs font-semibold text-faint">{s.day}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{s.title}</p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-line-soft">
                      <div
                        className={`h-full origin-left rounded-full ${full ? 'bg-success' : 'bg-brand'} ${inView ? 'animate-progress' : 'scale-x-0'}`}
                        style={{ width: `${(s.filled / s.need) * 100}%`, animationDelay: `${i * 120}ms` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      full ? 'bg-success-soft text-success' : 'bg-brand-soft text-brand'
                    }`}
                  >
                    {full ? <icons.check size={11} /> : <icons.alert size={11} />}
                    {s.filled}/{s.need}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
