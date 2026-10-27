import { useAuth } from '@newreplica/shared/auth';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Logo } from '../../../components/Logo';
import { icons } from '../../../components/icons';
import { NAV_LINKS } from '../content';

export function Header() {
  const { state } = useAuth();
  const signedIn = state.status === 'signedIn';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const solid = scrolled || open;

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
        solid ? 'border-b border-line bg-white/90 shadow-dx-sm backdrop-blur' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="Replica home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium lg:flex">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `relative py-1 transition after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:rounded-full after:bg-brand after:transition-transform after:duration-300 ${
                  isActive ? 'text-ink after:scale-x-100' : 'text-text after:scale-x-0 hover:text-ink hover:after:scale-x-100'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link to="/app" className="btn-primary">
              Open app
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden px-3 py-2 text-sm font-semibold text-ink hover:text-brand sm:inline-block">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary">
                Get started
              </Link>
            </>
          )}
          <button
            className="grid h-10 w-10 place-items-center rounded-lg text-ink hover:bg-navy-soft lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <icons.x /> : <icons.menu />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="animate-fade-up border-t border-line bg-white px-4 py-3 lg:hidden">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-base font-medium ${
                  isActive ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-navy-soft'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {!signedIn && (
            <Link to="/login" className="block rounded-lg px-3 py-2.5 text-base font-medium text-brand hover:bg-brand-soft">
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
