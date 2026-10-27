import { AuthProvider } from '@newreplica/shared/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { RequireAuth, RequirePermission, RequireSignedOut } from './components/guards';
import { Spinner } from './components/ui';
import { API_URL, storage } from './config';
import { LandingPage } from './pages/landing/LandingPage';
import { MarketingLayout } from './pages/landing/MarketingLayout';
import { FaqPage } from './pages/landing/pages/FaqPage';
import { FeaturesPage } from './pages/landing/pages/FeaturesPage';
import { HowItWorksPage } from './pages/landing/pages/HowItWorksPage';
import { PricingPage } from './pages/landing/pages/PricingPage';
import { VolunteersPage } from './pages/landing/pages/VolunteersPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyPage } from './pages/VerifyPage';
import './index.css';

// Signed-in screens load on demand so marketing pages stay light.
const AppShell = lazy(() => import('./layouts/AppShell').then((m) => ({ default: m.AppShell })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ModulePage = lazy(() => import('./pages/ModulePage').then((m) => ({ default: m.ModulePage })));
const VolunteerDatabasePage = lazy(() => import('./pages/volunteers/VolunteersPage').then((m) => ({ default: m.VolunteersPage })));
const VolunteerFormPage = lazy(() => import('./pages/volunteers/VolunteerFormPage').then((m) => ({ default: m.VolunteerFormPage })));
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout').then((m) => ({ default: m.SettingsLayout })));
const ProfileTab = lazy(() => import('./pages/settings/ProfileTab').then((m) => ({ default: m.ProfileTab })));
const LocationsTab = lazy(() => import('./pages/settings/PlacesTabs').then((m) => ({ default: m.LocationsTab })));
const DepartmentsTab = lazy(() => import('./pages/settings/PlacesTabs').then((m) => ({ default: m.DepartmentsTab })));
const TeamTab = lazy(() => import('./pages/settings/TeamTab').then((m) => ({ default: m.TeamTab })));
const RolesTab = lazy(() => import('./pages/settings/RolesTab').then((m) => ({ default: m.RolesTab })));

function PageSpinner() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Spinner className="h-6 w-6 text-brand" />
    </div>
  );
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider baseUrl={API_URL} storage={storage}>
        <BrowserRouter>
          <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route element={<MarketingLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/volunteers" element={<VolunteersPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/faq" element={<FaqPage />} />
            </Route>
            <Route element={<RequireSignedOut />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route path="/auth/verify" element={<VerifyPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/app" element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route element={<RequirePermission permission="volunteers:manage" />}>
                  <Route path="volunteers" element={<VolunteerDatabasePage />} />
                  <Route path="volunteers/new" element={<VolunteerFormPage />} />
                  <Route path="volunteers/:id" element={<VolunteerFormPage />} />
                </Route>
                <Route element={<RequirePermission permission="org:manage" />}>
                  <Route path="settings" element={<SettingsLayout />}>
                    <Route index element={<Navigate to="profile" replace />} />
                    <Route path="profile" element={<ProfileTab />} />
                    <Route path="locations" element={<LocationsTab />} />
                    <Route path="departments" element={<DepartmentsTab />} />
                    <Route path="team" element={<TeamTab />} />
                    <Route path="roles" element={<RolesTab />} />
                  </Route>
                </Route>
                <Route path=":module" element={<ModulePage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
