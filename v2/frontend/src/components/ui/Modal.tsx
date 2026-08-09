"use client";

import { modalContent, overlay } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
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
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Trava o scroll e devolve o foco a quem abriu.
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
  }, [open]);

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

  return (
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
            className={styles.dialog}
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

            <div className={styles.body}>{children}</div>

            {footer ? <footer className={styles.footer}>{footer}</footer> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
