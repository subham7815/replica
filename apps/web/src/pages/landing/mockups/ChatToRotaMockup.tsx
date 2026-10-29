import { icons } from '../../../components/icons';
import { useInView } from '../../../hooks/useReveal';
import { useTicker } from './useTicker';

const MESSAGES = [
  { me: true, text: 'Who can cover sorting this Saturday?' },
  { me: false, name: 'Priya', text: 'Can’t this week, sorry' },
  { me: false, name: 'Tom', text: 'Is that the 9am one or 10?' },
  { me: true, text: 'Still need 4 people!!' },
  { me: false, name: 'Ana', text: 'Only just seen this, I’m out too' },
];

const SLOTS = [
  { initials: 'PS', color: 'bg-brand' },
  { initials: 'TM', color: 'bg-navy' },
  { initials: 'AK', color: 'bg-success' },
  { initials: 'JO', color: 'bg-warning' },
  { initials: 'LB', color: 'bg-brand-dark' },
  { initials: 'RN', color: 'bg-navy-deep' },
];

const STEPS = 24;

export function ChatToRotaMockup() {
  const [ref, inView] = useInView<HTMLDivElement>('0px');
  const t = useTicker(STEPS, 650, inView);

  const shown = Math.min(MESSAGES.length, Math.floor((t + 1) / 2));
  const typing = t > 0 && t < 10 && t % 2 === 0;
  const rota = t >= 11;
  const filled = Math.max(0, Math.min(SLOTS.length, t - 12));
  const covered = filled === SLOTS.length;
  const reminded = t >= 19;

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-md" aria-hidden>
      <div
        className={`rounded-3xl border border-line bg-white shadow-dx-lg transition duration-700 ${
          rota ? 'scale-[0.97] opacity-40 blur-[1px]' : ''
        }`}
      >
        <div className="flex items-center gap-3 rounded-t-3xl bg-navy-deep px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white">
            <icons.message size={16} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Saturday volunteers</p>
            <p className="text-[11px] text-on-dark">38 members</p>
          </div>
        </div>
        <div className="flex h-72 flex-col justify-end gap-2 bg-navy-soft px-4 py-4 sm:h-80">
          {MESSAGES.slice(0, shown).map((m, i) => (
            <div key={i} className={`flex animate-pop-in ${m.me ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-[13px] shadow-dx-sm ${
                  m.me ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-white text-ink'
                }`}
              >
                {m.name && <p className="mb-0.5 text-[11px] font-semibold text-brand">{m.name}</p>}
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex animate-pop-in">
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-3 shadow-dx-sm">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-faint" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className={`absolute inset-x-4 bottom-6 rounded-2xl border border-line bg-white p-5 shadow-dx-lg transition duration-700 sm:-right-6 sm:left-10 ${
          rota ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-8 opacity-0'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-brand uppercase">DexServe rota</p>
            <p className="mt-1 font-semibold text-ink">Saturday · Food sorting</p>
            <p className="text-xs text-muted">09:00 – 12:00 · Main hall</p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-500 ${
              covered ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
            }`}
          >
            {covered ? <icons.check size={13} /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />}
            {covered ? 'Covered' : `${SLOTS.length - filled} spots left`}
          </span>
        </div>

        <div className="mt-4 flex -space-x-2">
          {SLOTS.map((s, i) =>
            i < filled ? (
              <span
                key={s.initials}
                className={`grid h-9 w-9 animate-pop-in place-items-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${s.color}`}
              >
                {s.initials}
              </span>
            ) : (
              <span key={s.initials} className="h-9 w-9 rounded-full border-2 border-dashed border-line-strong bg-white" />
            ),
          )}
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line-soft">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${covered ? 'bg-success' : 'bg-brand'}`}
            style={{ width: `${(filled / SLOTS.length) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>
            {filled}/{SLOTS.length} confirmed · 2 on waitlist
          </span>
          <span className={`inline-flex items-center gap-1 transition-opacity duration-500 ${reminded ? 'opacity-100' : 'opacity-0'}`}>
            <icons.bell size={12} /> Reminders sent
          </span>
        </div>
      </div>
    </div>
  );
}
