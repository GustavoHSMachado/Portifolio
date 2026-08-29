import { redirect } from "next/navigation";

/**
 * Rota mantida apenas para não quebrar links antigos.
 *
 * Até 22/08/2026 esta tela recebia um token de 64 caracteres pela URL e pedia a
 * senha nova. Com o segundo fator, a redefinição passou a usar um código de 7
 * dígitos digitado na tela — que não pode viajar pela URL, onde ficaria no
 * histórico do navegador, no cabeçalho Referer e nos logs de qualquer
 * intermediário. As duas etapas agora vivem em /recuperar-senha.
 *
 * Quem chegar aqui por um e-mail antigo cai no começo do fluxo e pede um código
 * novo — o token que ele traz não vale mais de qualquer forma.
 */
export default function RedefinirSenhaPage() {
  redirect("/recuperar-senha");
}
