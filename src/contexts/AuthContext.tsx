import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from '../services/auth.api';
import { setUnauthorizedListener } from '../services/session';
import type { AuthMeResponse, AuthUser, LoginPayload, RegisterPayload } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  athlete: AuthMeResponse | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch((error: Error) => {
        // Une erreur réseau/serveur au démarrage n'est pas "non connecté" à
        // proprement parler, mais on retombe sur l'écran de connexion plutôt
        // que de laisser l'app dans un état indéterminé.
        console.error('Erreur lors de la récupération de la session', error);
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Un 401 sur une requête métier (session expirée) est signalé ici de façon
  // centralisée par athletes.api.ts, plutôt que dans chaque card.
  useEffect(() => {
    setUnauthorizedListener(() => setSession(null));
    return () => setUnauthorizedListener(null);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await apiLogin(payload);
    setSession(data);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await apiRegister(payload);
    setSession(data);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.app_user ?? null,
        athlete: session,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>');
  }
  return context;
}
