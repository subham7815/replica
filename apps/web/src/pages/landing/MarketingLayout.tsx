import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { PAGE_TITLES } from './content';
import { Footer } from './sections/Footer';
import { Header } from './sections/Header';

export function MarketingLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = PAGE_TITLES[pathname] ?? 'Replica';
  }, [pathname]);

  return (
    <div className="overflow-x-clip">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
