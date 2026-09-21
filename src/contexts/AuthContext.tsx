import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { navigateTo } from '../utils/navigation';
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from '../services/auth.api';
import {
  FOCUS_REVALIDATE_MIN_INTERVAL_MS,
  createSessionRevalidator,
  setRevalidateListener,
  setUnauthorizedListener,
} from '../services/session';
import type { AuthMeResponse, AuthUser, LoginPayload, RegisterPayload } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  athlete: AuthMeResponse | null;
  loading: boolean;
  // Explication à afficher sur /login quand une session a été perdue (expirée,
  // fermée ailleurs) : jamais un "Accès réservé..." brut venant d'un 403.
  sessionNotice: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const SESSION_EXPIRED_NOTICE = 'Ta session a expiré. Reconnecte-toi pour continuer.';
const NO_ATHLETE_ACCESS_MESSAGE = "Ce compte ne possède pas d'accès athlète.";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // La revalidation compare avec la session COURANTE, pas celle capturée par
  // une closure : la ref est mise à jour en même temps que l'état.
  const sessionRef = useRef<AuthMeResponse | null>(null);
  const setSession = useCallback((next: AuthMeResponse | null) => {
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  // Vérifie auprès du backend que la session est toujours celle attendue.
  // Ne déconnecte que sur une preuve (401 = plus de session) ; une erreur
  // réseau/serveur laisse l'état intact.
  const revalidate = useRef(
    createSessionRevalidator(async () => {
      const current = sessionRef.current;
      if (!current) return;

      let fresh: AuthMeResponse | null;
      try {
        fresh = await getMe();
      } catch {
        return;
      }

      // Un logout/login a eu lieu pendant la vérification : elle est périmée.
      if (sessionRef.current?.id !== current.id) return;

      if (fresh === null) {
        setSession(null);
        setSessionNotice(SESSION_EXPIRED_NOTICE);
      } else if (fresh.id !== current.id) {
        // Une autre session a remplacé celle-ci (autre compte connecté dans un
        // autre onglet de cette app) : on adopte la nouvelle identité. L'app
        // remonte ses pages (clé = id) pour ne garder aucune donnée de l'ancienne.
        setSession(fresh);
      }
    }),
  ).current;

  // Bootstrap déterministe : loading -> /me -> authentifié OU anonyme, et
  // seulement ensuite les routes protégées.
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
        if (!cancelled) {
          revalidate.markChecked();
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [revalidate, setSession]);

  // 401 sur une requête métier : la session n'existe plus. Signalé de façon
  // centralisée par apiClient.ts plutôt que dans chaque card. 403 : demande de
  // revalidation (jamais une déconnexion directe).
  useEffect(() => {
    setUnauthorizedListener(() => {
      if (sessionRef.current === null) return;
      setSession(null);
      setSessionNotice(SESSION_EXPIRED_NOTICE);
    });
    setRevalidateListener((minIntervalMs) => {
      void revalidate(minIntervalMs);
    });
    return () => {
      setUnauthorizedListener(null);
      setRevalidateListener(null);
    };
  }, [revalidate, setSession]);

  // Retour d'un onglet resté inactif : revalidation throttlée (focus et
  // visibilitychange se déclenchent ensemble au changement d'onglet, la
  // déduplication/le throttle n'en font qu'une requête).
  const hasSession = session !== null;
  useEffect(() => {
    if (!hasSession) return;

    function onReturn() {
      if (document.visibilityState === 'hidden') return;
      void revalidate(FOCUS_REVALIDATE_MIN_INTERVAL_MS);
    }
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [hasSession, revalidate]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const data = await apiLogin(payload);
      if (data === null) {
        // Compte valide mais sans profil athlète (ex. coach-only) : aucune
        // session athlète exploitable. Le cookie athlète vient d'être posé,
        // on le referme (sans toucher la session coach).
        await apiLogout().catch(() => {});
        throw new Error(NO_ATHLETE_ACCESS_MESSAGE);
      }
      setSessionNotice(null);
      setSession(data);
    },
    [setSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const data = await apiRegister(payload);
      setSessionNotice(null);
      setSession(data);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    // Déconnexion volontaire : on quitte la page AVANT d'effacer la session,
    // sinon la garde de routes mémoriserait cette page comme "destination à
    // retrouver" pour la prochaine connexion (possiblement un autre compte).
    navigateTo('/login', 'replace');
    setSessionNotice(null);
    setSession(null);
  }, [setSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.app_user ?? null,
      athlete: session,
      loading,
      sessionNotice,
      login,
      register,
      logout,
    }),
    [session, loading, sessionNotice, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>');
  }
  return context;
}
