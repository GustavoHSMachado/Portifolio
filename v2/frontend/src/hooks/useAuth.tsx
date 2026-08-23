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
  /** Primeiro passo: confere a senha e dispara o código. Não abre sessão. */
  login: (email: string, password: string) => Promise<{ expiresIn: number }>;
  /** Segundo passo: troca o código pela sessão. */
  verifyLoginCode: (email: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface SessaoRenovada {
  user: User;
  accessToken: string;
  expiresIn: number;
}

/**
 * Renovação em voo, compartilhada por toda a aba.
 *
 * O refresh token é rotativo e de uso único: usar o mesmo duas vezes é, para o
 * servidor, indício de token roubado — ele revoga a família inteira e derruba a
 * sessão. Isso transforma qualquer chamada concorrente em logout.
 *
 * E concorrência aqui é rotina, não exceção: com o StrictMode, o efeito de
 * montagem roda duas vezes em desenvolvimento, e as duas chamadas saem com o
 * mesmo cookie. Era o que acontecia a cada F5 — a sessão válida virava tela de
 * login. Fora do provider porque precisa sobreviver à remontagem que causa o
 * problema; um ref dentro do componente nasceria zerado junto com ela.
 *
 * O api.ts tem a mesma proteção para o refresh disparado por 401, mas aquela
 * promise é interna ao módulo e não cobre esta chamada, que passa por fora do
 * interceptor (skipAuth).
 *
 * O que isto NÃO cobre: duas abas abertas ao mesmo tempo, cada uma com seu
 * próprio módulo. Fechar essa porta exige janela de tolerância na rotação, do
 * lado do servidor.
 */
let renovacaoEmAndamento: Promise<SessaoRenovada> | null = null;

function renovarSessao(): Promise<SessaoRenovada> {
  if (renovacaoEmAndamento) {
    return renovacaoEmAndamento;
  }

  renovacaoEmAndamento = api
    .post<SessaoRenovada>("/api/v1/auth/refresh", undefined, { skipAuth: true })
    .then((result) => result.data)
    .finally(() => {
      renovacaoEmAndamento = null;
    });

  return renovacaoEmAndamento;
}

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
      const sessao = await renovarSessao();

      setAccessToken(sessao.accessToken);
      setUser(sessao.user);
      scheduleRefresh(sessao.expiresIn);
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

  /**
   * Primeiro passo do login. Não guarda token nem popula o usuário: com o
   * segundo fator, senha correta ainda não é sessão. Devolve só quanto tempo o
   * código dura, para a tela conseguir mostrar a contagem.
   */
  const login = useCallback(
    async (email: string, password: string): Promise<{ expiresIn: number }> => {
      const result = await api.post<{ challenge: string; expiresIn: number }>(
        "/api/v1/auth/login",
        { email, password },
        { skipAuth: true },
      );

      return { expiresIn: result.data.expiresIn };
    },
    [],
  );

  /**
   * Segundo passo. É aqui que a sessão nasce, e por isso é aqui que o contexto
   * é populado e a renovação agendada — o mesmo cuidado que o login de um passo
   * exigia antes.
   */
  const verifyLoginCode = useCallback(
    async (email: string, code: string): Promise<User> => {
      const result = await api.post<{ user: User; accessToken: string; expiresIn: number }>(
        "/api/v1/auth/login/verify",
        { email, code },
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
    () => ({ user, loading, login, verifyLoginCode, logout, refreshUser }),
    [user, loading, login, verifyLoginCode, logout, refreshUser],
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

  /**
   * Saída para quando o servidor recusa o que o papel deixava passar.
   *
   * O papel no banco é só metade da regra: o RequireAdmin também exige que o
   * e-mail seja o do ADMIN_EMAIL, e essa parte mora no .env do servidor — o
   * cliente não tem como consultá-la. Uma conta marcada como admin no banco
   * que não seja aquela passa pela guarda acima e leva 403 na primeira
   * chamada. Sem isto, o resultado era uma tela administrativa aberta e vazia:
   * nenhum dado vazava, mas ficava a impressão de que havia algo ali.
   */
  const sairSeBarrado = useCallback(
    (error: unknown): boolean => {
      if (!(error instanceof ApiError)) {
        return false;
      }

      if (error.status === 401) {
        router.replace("/entrar");

        return true;
      }

      if (error.status === 403) {
        router.replace("/painel");

        return true;
      }

      return false;
    },
    [router],
  );

  return { user, loading, sairSeBarrado };
}
