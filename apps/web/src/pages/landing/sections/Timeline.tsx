import { useInView } from '../../../hooks/useReveal';

export function Timeline({ steps, className = '' }: { steps: { title: string; body: string }[]; className?: string }) {
  const [ref, inView] = useInView<HTMLOListElement>();
  const stagger = Math.max(120, Math.round(900 / steps.length));

  return (
    <ol ref={ref} className={`relative space-y-8 ${className}`}>
      <span aria-hidden className="absolute top-2 bottom-2 left-5 w-0.5 bg-line" />
      <span
        aria-hidden
        className={`absolute top-2 bottom-2 left-5 w-0.5 origin-top bg-brand transition-transform ease-out ${
          inView ? 'scale-y-100' : 'scale-y-0'
        }`}
        style={{ transitionDuration: `${stagger * steps.length + 600}ms` }}
      />
      {steps.map((s, i) => (
        <li
          key={s.title}
          className={`relative flex gap-5 ${inView ? 'animate-reveal' : 'opacity-0'}`}
          style={{ animationDelay: `${i * stagger}ms` }}
        >
          <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white ring-4 ring-surface">
            {i + 1}
          </span>
          <div className="pt-1.5">
            <h3 className="text-lg font-semibold">{s.title}</h3>
            <p className="mt-1 leading-relaxed">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
