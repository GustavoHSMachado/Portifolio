/**
 * O que servidor e cliente precisam saber sobre o tema, em comum.
 *
 * Este arquivo não tem "use client" de propósito, e é por isso que existe
 * separado do hook. Uma constante exportada de um módulo cliente não chega como
 * valor ao Server Component que a importa — o Next a substitui por uma
 * referência de módulo, e o script que o layout monta saía com
 * `localStorage.getItem({})`, procurando uma chave que nunca existiu. O
 * sintoma era o tema escolhido não sobreviver ao recarregar.
 */

export type Tema = "claro" | "escuro";

/** Onde a escolha fica guardada, lida pelo script anti-flash e pelo hook. */
export const CHAVE_TEMA = "portifolio:tema";

/** A cor da barra do navegador em cada tema, igual ao --surface-base. */
export const COR_DA_BARRA: Record<Tema, string> = {
  claro: "#ffffff",
  escuro: "#0b0b0f",
};
