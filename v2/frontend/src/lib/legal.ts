/**
 * Versões vigentes dos documentos legais.
 *
 * Precisam bater com TERMS_VERSION e PRIVACY_VERSION do backend: é essa versão
 * que fica gravada no aceite do usuário. Se você alterar o texto de um documento
 * de forma relevante, **incremente a versão aqui e no .env da API** — senão o
 * registro de consentimento apontará para um texto que não existe mais.
 */
export const LEGAL_VERSIONS = {
  terms: "1.0.0",
  privacy: "1.0.0",
} as const;

export const LEGAL_UPDATED_AT = "09/08/2026";
