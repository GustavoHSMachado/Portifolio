/**
 * Cliente HTTP da API.
 *
 * Decisões de segurança espelhando o backend:
 * - o access token vive só em memória (nunca localStorage — XSS levaria a sessão);
 * - o refresh token é um cookie httpOnly que o JS nunca lê;
 * - um 401 dispara UM refresh; requisições concorrentes esperam a mesma promise
 *   em vez de disparar N refreshes e queimar a rotação de tokens.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Erro de validação por campo, para pintar o formulário. */
  get isValidation(): boolean {
    return this.status === 422;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** Falha de rede ou servidor fora — vale oferecer "tentar de novo". */
  get isRetryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

/* ------------------------------------------------------------------ */
/* Token em memória                                                    */
/* ------------------------------------------------------------------ */

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/* ------------------------------------------------------------------ */
/* Núcleo                                                              */
/* ------------------------------------------------------------------ */

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Rotas públicas não tentam refresh ao receber 401. */
  skipAuth?: boolean;
  timeoutMs?: number;
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const { body, skipAuth = false, timeoutMs = 15_000, headers, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...((headers as Record<string, string>) ?? {}),
  };

  if (!skipAuth && accessToken) {
    finalHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let response: globalThis.Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Necessário para o cookie httpOnly de refresh trafegar.
      credentials: "include",
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("A requisição demorou demais. Verifique sua conexão.", 0, "timeout");
    }

    throw new ApiError("Não foi possível conectar ao servidor.", 0, "network_error");
  }

  clearTimeout(timer);

  if (response.status === 204) {
    return { data: null as T };
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new ApiError("Resposta inválida do servidor.", response.status, "invalid_response");
  }

  if (!response.ok) {
    throw new ApiError(
      (payload.error as string) ?? "Ocorreu um erro inesperado.",
      response.status,
      payload.code as string | undefined,
      (payload.errors as Record<string, string[]>) ?? {},
    );
  }

  return payload as unknown as ApiSuccess<T>;
}

/**
 * Renova o access token. Chamadas concorrentes compartilham a mesma promise:
 * o backend rotaciona o refresh token e um segundo refresh em paralelo seria
 * interpretado como reuso — derrubando a sessão inteira do usuário.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const result = await rawRequest<{ accessToken: string }>("/api/v1/auth/refresh", {
        method: "POST",
        skipAuth: true,
      });

      accessToken = result.data.accessToken;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    const shouldRetry =
      error instanceof ApiError && error.status === 401 && !options.skipAuth && accessToken !== null;

    if (!shouldRetry) {
      throw error;
    }

    const renewed = await refreshAccessToken();

    if (!renewed) {
      throw error;
    }

    return rawRequest<T>(path, options);
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
