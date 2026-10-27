import type { ReactNode } from 'react';

export function PageHero({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby="page-title" className="relative border-b border-line">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-[-8%] h-120 w-120 animate-drift rounded-full bg-brand-soft blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-90 w-90 animate-drift rounded-full bg-navy-soft blur-3xl [animation-delay:-9s]" />
      </div>
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="animate-fade-up text-xs font-semibold tracking-widest text-brand uppercase">{eyebrow}</p>
        <h1 id="page-title" className="display mt-4 animate-fade-up text-4xl [animation-delay:80ms] sm:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl animate-fade-up text-lg leading-relaxed [animation-delay:160ms] sm:text-xl">{sub}</p>
        {children && <div className="mt-9 flex animate-fade-up flex-col items-center gap-6 [animation-delay:240ms]">{children}</div>}
      </div>
    </section>
  );
}
