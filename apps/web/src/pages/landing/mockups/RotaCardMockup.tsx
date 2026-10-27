import { icons } from '../../../components/icons';
import { useInView } from '../../../hooks/useReveal';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROLES = [
  { name: 'Food sorting', filled: 4, need: 4 },
  { name: 'Distribution', filled: 2, need: 3 },
  { name: 'Welcome desk', filled: 1, need: 1 },
];

export function RotaCardMockup() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="card w-full max-w-md p-6 shadow-dx" aria-hidden>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">Riverside Food Bank</p>
        <span className="text-xs text-faint">Sample data</span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {DAYS.map((d, i) => {
          const active = i === 5;
          const has = i === 1 || i === 3 || i === 5;
          return (
            <div
              key={d}
              className={`rounded-lg py-2 text-xs font-medium ${
                active ? 'bg-brand text-white shadow-dx-sm' : has ? 'bg-brand-soft text-brand' : 'bg-surface text-faint'
              }`}
            >
              {d}
              <span className={`mx-auto mt-1 block h-1 w-1 rounded-full ${has ? (active ? 'bg-white' : 'bg-brand') : 'bg-transparent'}`} />
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-line p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">Saturday distribution</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <icons.clock size={12} /> 09:00 – 13:00
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />1 spot left
          </span>
        </div>
        <ul className="mt-4 space-y-3">
          {ROLES.map((r, i) => {
            const full = r.filled === r.need;
            return (
              <li key={r.name}>
                <div className="flex justify-between text-xs">
                  <span className="text-text">{r.name}</span>
                  <span className={full ? 'font-medium text-success' : 'font-medium text-brand'}>
                    {r.filled}/{r.need}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-soft">
                  <div
                    className={`h-full origin-left rounded-full ${full ? 'bg-success' : 'bg-brand'} ${inView ? 'animate-progress' : 'scale-x-0'}`}
                    style={{ width: `${(r.filled / r.need) * 100}%`, animationDelay: `${200 + i * 150}ms` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex items-center gap-1.5 border-t border-line-soft pt-3 text-xs text-muted">
          <icons.refresh size={12} /> 2 people on the waitlist
        </p>
      </div>
    </div>
  );
}
