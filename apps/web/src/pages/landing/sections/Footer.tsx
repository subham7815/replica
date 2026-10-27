import { Link } from 'react-router';
import { Logo } from '../../../components/Logo';
import { StoreBadges } from '../../../components/StoreBadges';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Features', to: '/features' },
      { label: 'For volunteers', to: '/volunteers' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Create an organisation', to: '/register' },
      { label: 'Sign in', to: '/login' },
      { label: 'Volunteer sign in', to: '/login' },
    ],
  },
  {
    title: 'Help',
    links: [{ label: 'FAQ', to: '/faq' }],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_repeat(3,1fr)]">
        <div>
          <Link to="/" aria-label="Replica home">
            <Logo />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Rotas, reminders and check-ins for community volunteer teams, on web, iOS and Android.
          </p>
          <div className="mt-6">
            <StoreBadges />
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-ink">{col.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="transition hover:text-brand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line-soft">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-faint sm:px-6">© {new Date().getFullYear()} Replica. All rights reserved.</p>
      </div>
    </footer>
  );
}
