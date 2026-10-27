import { Link } from 'react-router';
import { StoreBadges } from '../../../components/StoreBadges';
import { HERO } from '../content';
import { ChatToRotaMockup } from '../mockups/ChatToRotaMockup';

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-130 w-130 animate-drift rounded-full bg-brand-soft blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-90 w-90 animate-drift rounded-full bg-navy-soft blur-3xl [animation-delay:-9s]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20 lg:pb-28">
        <div>
          <h1 id="hero-title" className="display animate-fade-up text-5xl sm:text-6xl lg:text-7xl">
            {HERO.title}
          </h1>
          <div className="mt-7 space-y-1 text-lg leading-relaxed text-text sm:text-xl">
            {HERO.lines.map((line, i) => (
              <p
                key={line}
                className={`animate-fade-up ${i === HERO.lines.length - 1 ? 'font-semibold text-ink' : ''}`}
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                {line}
              </p>
            ))}
          </div>

          <div className="mt-9 animate-fade-up [animation-delay:520ms]">
            <Link to="/register" className="btn-primary px-7 py-4 text-base">
              {HERO.cta}
            </Link>
            <p className="mt-3 text-sm text-muted">No credit card needed.</p>
          </div>

          <div className="mt-8 animate-fade-up [animation-delay:600ms]">
            <p className="mb-3 text-sm text-muted">
              Volunteers: get the mobile app, or{' '}
              <Link to="/login" className="font-semibold text-brand hover:text-brand-dark">
                sign in on the web
              </Link>
            </p>
            <StoreBadges />
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:300ms]">
          <ChatToRotaMockup />
          <p className="sr-only">
            Illustration: a group chat full of unanswered requests for cover, replaced by a Replica rota that fills itself.
          </p>
        </div>
      </div>
    </section>
  );
}
