"use client";

import { modalContent, overlay } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * "larga" ocupa quase a tela inteira. Serve à galeria de fotos: captura de
   * sistema é larga, e numa caixa de 520px o texto dela fica ilegível.
   */
  largura?: "padrao" | "larga";
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal.
 *
 * O que costuma faltar em modal caseiro e está resolvido aqui:
 * - Escape fecha;
 * - clique no overlay fecha, clique no conteúdo não (stopPropagation);
 * - foco vai para o diálogo ao abrir e volta ao gatilho ao fechar;
 * - Tab fica preso dentro do diálogo (focus trap);
 * - o scroll do body trava sem a página "pular" pela largura da barra.
 */
export function Modal({ open, onClose, title, children, footer, largura = "padrao" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const triggerRef = useRef<HTMLElement | null>(null);

  /*
   * O diálogo é levado para o <body> por um portal.
   *
   * "position: fixed" se posiciona em relação à viewport — exceto quando um
   * ancestral tem "transform", que cria um novo containing block e vira a
   * referência. Na vitrine o cartão do projeto é animado pelo framer-motion,
   * e a galeria aberta de dentro dele renderizava com 219px de largura,
   * espremida no lugar do cartão. O portal tira o diálogo dessa árvore.
   *
   * Pior que o tamanho era a intermitência: o transform só existe durante a
   * animação, então o mesmo código acertava ou errava conforme o momento.
   *
   * O estado existe porque "document" não existe no servidor.
   */
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  // Trava o scroll e devolve o foco a quem abriu.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `montado` não é lido aqui dentro — está nas dependências de propósito. O portal só existe depois do primeiro render, e sem essa dependência o efeito roda uma vez com dialogRef ainda nulo e o foco nunca chega ao diálogo.
  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement;

    // Compensa a barra de rolagem para o conteúdo não deslocar ao travar o scroll.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      triggerRef.current?.focus();
    };
    // 'montado' entra aqui porque o portal só existe depois do primeiro
    // render: sem ele, este efeito roda quando dialogRef ainda é null e o
    // foco nunca chega ao diálogo.
  }, [open, montado]);

  // Escape fecha; Tab circula dentro do diálogo.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );

      // Um diálogo sem nada focável dentro deixa first e last indefinidos.
      // Sem esta guarda o focus trap quebra em tempo de execução — era o que
      // o TypeScript vinha apontando e ninguém tinha rodado para ver.
      const first = focusables[0];
      const last = focusables.at(-1);

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!montado) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.overlay}
          variants={overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            className={
              largura === "larga" ? `${styles.dialog} ${styles.dialogLarga}` : styles.dialog
            }
            variants={modalContent}
            // biome-ignore lint/a11y/useSemanticElements: o <dialog> nativo só abre por showModal() e fecha por close(), o que conflita com a animação de saída do AnimatePresence — o elemento sumiria antes de animar. role="dialog" com aria-modal, focus trap e Escape entrega o mesmo contrato de acessibilidade.
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.header}>
              <h2 id="modal-title" className={styles.title}>
                {title}
              </h2>
              <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
                ×
              </button>
            </header>

            <div
              className={largura === "larga" ? `${styles.body} ${styles.bodyLarga}` : styles.body}
            >
              {children}
            </div>

            {footer ? <footer className={styles.footer}>{footer}</footer> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
