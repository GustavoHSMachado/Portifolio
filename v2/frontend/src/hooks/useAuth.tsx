"use client";

import { ApiError, api, setAccessToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
}

interface AuthState {
  user: User | null;
  /** true enquanto a sessão inicial ainda não foi resolvida. */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Estado de autenticação da aplicação.
 *
 * Duas decisões que importam:
 *
 * 1. **`loading` começa `true`.** No primeiro render não sabemos se existe
 *    sessão — o cookie de refresh é httpOnly e só o servidor pode dizer. Renderizar
 *    "deslogado" antes de perguntar causaria um flash de tela de login em quem
 *    já está autenticado, que é o defeito mais visível de SPA mal feita.
 *
 * 2. **Renovação agendada.** Em vez de esperar um 401 para renovar, agendamos o
 *    refresh para 60s antes da expiração. O usuário nunca vê uma requisição falhar.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(
    (expiresIn: number) => {
      clearTimer();
      // Margem de 60s, com piso de 10s para TTLs curtos em desenvolvimento.
      const delay = Math.max(expiresIn - 60, 10) * 1000;
      refreshTimer.current = setTimeout(() => void silentRefresh(), delay);
    },
    [clearTimer],
  );

  const silentRefresh = useCallback(async () => {
    try {
      const result = await api.post<{ user: User; accessToken: string; expiresIn: number }>(
        "/api/v1/auth/refresh",
        undefined,
        { skipAuth: true },
      );

      setAccessToken(result.data.accessToken);
      setUser(result.data.user);
      scheduleRefresh(result.data.expiresIn);
    } catch {
      // Sem sessão válida — estado deslogado é o resultado correto, não um erro.
      setAccessToken(null);
      setUser(null);
      clearTimer();
    } finally {
      setLoading(false);
    }
  }, [scheduleRefresh, clearTimer]);

  // Resolve a sessão uma vez, na montagem.
  useEffect(() => {
    void silentRefresh();
    return clearTimer;
  }, [silentRefresh, clearTimer]);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const result = await api.post<{ user: User; accessToken: string; expiresIn: number }>(
        "/api/v1/auth/login",
        { email, password },
        { skipAuth: true },
      );

      setAccessToken(result.data.accessToken);
      setUser(result.data.user);
      scheduleRefresh(result.data.expiresIn);

      return result.data.user;
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // Falhar o logout no servidor não pode impedir o logout local.
    } finally {
      setAccessToken(null);
      setUser(null);
      clearTimer();
    }
  }, [clearTimer]);

  const refreshUser = useCallback(async () => {
    try {
      const result = await api.get<User>("/api/v1/me");
      setUser(result.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
      }
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  }

  return context;
}

/**
 * Guarda de rota no cliente.
 *
 * Importante: isto é conveniência de navegação, **não** controle de acesso.
 * A autorização real é do servidor — esconder uma tela no front não protege
 * nada. Ver CONTEXTO-DO-PROJETO.md, seção 4, item 8.
 */
export function useRequireAuth(options: { adminOnly?: boolean } = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/entrar");
      return;
    }

    if (options.adminOnly && user.role !== "admin") {
      router.replace("/painel");
    }
  }, [user, loading, options.adminOnly, router]);

  return { user, loading };
}
