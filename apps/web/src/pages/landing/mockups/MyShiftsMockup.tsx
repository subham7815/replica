import { icons } from '../../../components/icons';

const SHIFTS = [
  { when: 'This Sat · 09:00', title: 'Food sorting', place: 'Main hall', status: 'confirmed' as const },
  { when: 'Next Tue · 18:00', title: 'Evening packing', place: 'Warehouse', status: 'waitlist' as const },
  { when: 'Sat 16th · 10:00', title: 'Distribution', place: 'Front desk', status: 'confirmed' as const },
];

export function MyShiftsMockup() {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[2.75rem] bg-ink p-3 shadow-dx-lg" aria-hidden>
      <div className="overflow-hidden rounded-[2.1rem] bg-surface">
        <div className="flex justify-center pt-2.5">
          <span className="h-5 w-24 rounded-full bg-ink" />
        </div>
        <div className="px-5 pt-5 pb-3">
          <p className="text-[11px] font-semibold tracking-widest text-brand uppercase">Riverside Food Bank</p>
          <p className="mt-1 text-xl font-bold text-ink">My shifts</p>
        </div>
        <ul className="space-y-2.5 px-4 pb-4">
          {SHIFTS.map((s, i) => (
            <li
              key={s.title}
              className="animate-pop-in rounded-2xl border border-line bg-white p-3.5 shadow-dx-sm"
              style={{ animationDelay: `${300 + i * 180}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-muted">{s.when}</p>
                {s.status === 'confirmed' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                    <icons.check size={10} /> Confirmed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" /> Waitlist #2
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm font-semibold text-ink">{s.title}</p>
              <p className="text-[11px] text-muted">{s.place}</p>
            </li>
          ))}
        </ul>
        <div className="border-t border-line bg-white px-4 py-3">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-xs font-semibold text-white">
            <icons.qr size={14} /> Check in
          </div>
          <p className="mt-2 text-center text-[10px] text-muted">Can’t make it? Drop a shift in one tap.</p>
        </div>
      </div>
    </div>
  );
}
