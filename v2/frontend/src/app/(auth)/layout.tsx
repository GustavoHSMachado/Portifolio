import type { Metadata } from "next";
import type { ReactNode } from "react";
import styles from "./layout.module.css";

/**
 * Telas de acesso saem do índice.
 *
 * Formulário de login não tem conteúdo a ranquear e ainda disputa com a home a
 * busca pelo nome — o resultado é o visitante caindo numa tela de senha em vez
 * do portfólio.
 */
export const metadata: Metadata = {
  title: "Acesso",
  robots: { index: false, follow: false },
};

/**
 * Moldura das telas de autenticação.
 * Centralizada, largura contida e sem navegação — nesta etapa o usuário tem
 * uma tarefa só, e qualquer link a mais é uma chance de ele desistir dela.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.glow} aria-hidden="true" />
      <main id="conteudo" className={styles.content}>
        {children}
      </main>
    </div>
  );
}
