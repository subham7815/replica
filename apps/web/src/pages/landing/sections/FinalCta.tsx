import { Link } from 'react-router';
import { StoreBadges } from '../../../components/StoreBadges';
import { Reveal } from '../../../hooks/useReveal';

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="px-4 pb-20 sm:px-6 sm:pb-28">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand-dark to-brand-deep px-6 py-16 text-center shadow-dx-lg sm:px-12 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 animate-drift rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-20 -bottom-28 h-80 w-80 animate-drift rounded-full bg-navy-deep/40 blur-3xl [animation-delay:-9s]" />
        <div className="relative">
          <h2 id="cta-title" className="display text-4xl text-white sm:text-6xl">
            Your next rota, sorted.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
            Free during beta. Fewer messages, fewer no-shows, and every shift covered.
          </p>
          <Link
            to="/register"
            className="btn mt-9 bg-white px-7 py-4 text-base text-brand shadow-dx hover:bg-brand-soft focus-visible:ring-white/40"
          >
            Create your first rota, free
          </Link>
          <div className="mt-8 flex justify-center">
            <StoreBadges onDark />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
