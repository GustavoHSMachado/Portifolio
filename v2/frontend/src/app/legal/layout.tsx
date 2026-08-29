import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./layout.module.css";

/**
 * Moldura dos documentos legais.
 * Largura de leitura contida (~68 caracteres por linha) porque texto jurídico
 * é longo e denso — linha larga demais faz o olho perder a próxima linha.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <main id="conteudo" className={styles.container}>
        <Link href="/" className={styles.back}>
          <span aria-hidden="true">←</span> Voltar ao início
        </Link>

        <article className={styles.document}>{children}</article>

        <footer className={styles.footer}>
          <Link href="/legal/termos-de-uso" className={styles.footerLink}>
            Termos de Uso
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/legal/politica-de-privacidade" className={styles.footerLink}>
            Política de Privacidade
          </Link>
        </footer>
      </main>
    </div>
  );
}
