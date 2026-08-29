"use client";

import { motion } from "framer-motion";
import { forwardRef, useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./Checkbox.module.css";

interface CheckboxProps extends Omit<ComponentPropsWithoutRef<"input">, "type"> {
  label: ReactNode;
  error?: string;
}

/**
 * Caixa de seleção acessível.
 *
 * O input nativo continua no DOM (só visualmente oculto), então teclado,
 * leitores de tela e autofill funcionam sem gambiarra. O que desenhamos é
 * apenas a representação visual — trocar `<input>` por `<div role="checkbox">`
 * é o caminho mais rápido para quebrar acessibilidade.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, className, ...props },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={[styles.wrapper, className ?? ""].filter(Boolean).join(" ")}>
      <div className={styles.row}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />

        <label className={styles.label} htmlFor={id}>
          <span className={styles.box} data-error={Boolean(error)} aria-hidden="true">
            <motion.svg
              className={styles.check}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </motion.svg>
          </span>

          <span className={styles.text}>{label}</span>
        </label>
      </div>

      {error ? (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
});
