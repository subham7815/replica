import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, createApiClient, type ApiClient } from './api';
import { can, type Permission } from './permissions';
import type { AuthResponse, User } from './schemas';

export interface KeyValueStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const TOKEN_KEY = 'vs.session';
const ORG_KEY = 'vs.org';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: User };

interface AuthContextValue {
  state: AuthState;
  user: User | null;
  api: ApiClient;
  completeSignIn: (res: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  baseUrl,
  storage,
  children,
}: {
  baseUrl: string;
  storage: KeyValueStorage;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });
  // Kept in a ref so the API client reads the current organisation without being recreated.
  const orgRef = useRef<string | null>(null);

  const signOut = useCallback(async () => {
    await Promise.all([storage.remove(TOKEN_KEY), storage.remove(ORG_KEY)]);
    orgRef.current = null;
    queryClient.clear();
    setState({ status: 'signedOut', user: null });
  }, [storage, queryClient]);

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl,
        getToken: () => storage.get(TOKEN_KEY),
        getOrganizationId: () => orgRef.current,
        onUnauthorized: () => void signOut(),
      }),
    [baseUrl, storage, signOut],
  );

  const adopt = useCallback(
    async (user: User) => {
      orgRef.current = user.organization?.id ?? null;
      if (orgRef.current) await storage.set(ORG_KEY, orgRef.current);
      setState({ status: 'signedIn', user });
    },
    [storage],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [token, org] = await Promise.all([storage.get(TOKEN_KEY), storage.get(ORG_KEY)]);
      if (!token) {
        if (!cancelled) setState({ status: 'signedOut', user: null });
        return;
      }
      orgRef.current = org;
      try {
        let user: User;
        try {
          user = await api.me();
        } catch (err) {
          // The remembered organisation may no longer be available; fall back to the default one.
          if (!(err instanceof ApiError && err.status === 403 && org)) throw err;
          orgRef.current = null;
          await storage.remove(ORG_KEY);
          user = await api.me();
        }
        if (!cancelled) await adopt(user);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await storage.remove(TOKEN_KEY);
        if (!cancelled) setState({ status: 'signedOut', user: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, storage, adopt]);

  const completeSignIn = useCallback(
    async (res: AuthResponse) => {
      await storage.set(TOKEN_KEY, res.token);
      queryClient.clear();
      await adopt(res.user);
    },
    [storage, queryClient, adopt],
  );

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      orgRef.current = organizationId;
      queryClient.clear();
      await adopt(await api.me());
    },
    [api, queryClient, adopt],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.user,
      api,
      completeSignIn,
      signOut,
      switchOrganization,
      can: (permission) => can(state.user?.role, permission),
    }),
    [state, api, completeSignIn, signOut, switchOrganization],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
