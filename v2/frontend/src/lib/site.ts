/**
 * Endereço público do site.
 *
 * Sitemap, robots, canonical e Open Graph precisam de URL absoluta — endereço
 * relativo em qualquer um deles é ignorado por buscador e por rede social. A
 * origem vem do ambiente para o mesmo build servir localhost, staging e
 * produção sem recompilar.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Rotas que não devem ser indexadas: área autenticada e telas de acesso. */
export const PRIVATE_PATHS = [
  "/painel",
  "/admin",
  "/entrar",
  "/criar-conta",
  "/recuperar-senha",
  "/redefinir-senha",
  "/confirmar-email",
] as const;
