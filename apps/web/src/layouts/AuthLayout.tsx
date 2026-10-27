import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-navy-deep p-12 text-on-dark lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-105 w-105 rounded-full bg-brand/30 blur-3xl animate-drift"
        />
        <Link to="/" className="relative">
          <Logo dark />
        </Link>
        <div className="relative max-w-md">
          <p className="text-3xl leading-tight font-semibold tracking-tight text-white">
            Fill every shift without chasing anyone.
          </p>
          <p className="mt-4 text-sm leading-relaxed">
            Volunteers book themselves, gaps refill from the waitlist and hours log at the door, on web, iOS and Android.
          </p>
        </div>
        <ul className="relative space-y-2 text-sm">
          {['Self-booking rotas with waitlists', 'Reminders that cut no-shows', 'QR check-in and logged hours'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-on-dark" />
              {t}
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm animate-fade-up">
          <Link to="/" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
