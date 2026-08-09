import type { ReactNode } from "react";
import styles from "./layout.module.css";

/**
 * Moldura das telas de autenticação.
 * Centralizada, largura contida e sem navegação — nesta etapa o usuário tem
 * uma tarefa só, e qualquer link a mais é uma chance de ele desistir dela.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
