import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { icons } from '../../../components/icons';

export function LearnMore({ to, children, onDark = false }: { to: string; children: ReactNode; onDark?: boolean }) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-1.5 font-semibold transition ${
        onDark ? 'text-brand-on-dark hover:text-white' : 'text-brand hover:text-brand-dark'
      }`}
    >
      {children}
      <icons.arrowRight size={16} className="transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
