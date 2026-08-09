"use client";

import { AnimatePresence, motion } from "framer-motion";
import { forwardRef, useId, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { transition } from "@/lib/motion";
import styles from "./Input.module.css";

interface InputProps extends Omit<ComponentPropsWithoutRef<"input">, "size"> {
  label: string;
  error?: string;
  hint?: string;
  /** Campo de senha com botão de revelar. */
  revealable?: boolean;
}

/**
 * Campo de formulário com rótulo flutuante e erro animado.
 *
 * Detalhes que separam "funciona" de "bem feito":
 *
 * - O erro entra com altura animada, então o formulário cresce suavemente
 *   em vez de empurrar os campos de baixo de uma vez.
 * - O rótulo é sempre visível (nunca só placeholder): placeholder-como-rótulo
 *   some quando o usuário digita e destrói a revisão do formulário preenchido.
 * - aria-invalid e aria-describedby ligam o erro ao campo para leitores de tela.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, revealable = false, className, type = "text", ...props },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [revealed, setRevealed] = useState(false);

  const inputType = revealable ? (revealed ? "text" : "password") : type;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div className={[styles.field, className ?? ""].filter(Boolean).join(" ")}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>

      <div className={styles.inputWrap} data-error={Boolean(error)}>
        <input
          ref={ref}
          id={id}
          type={inputType}
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          {...props}
        />

        {revealable ? (
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={revealed}
            tabIndex={0}
          >
            {revealed ? "Ocultar" : "Mostrar"}
          </button>
        ) : null}
      </div>

      {hint && !error ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}

      {/*
        Exceção consciente à regra de "não animar propriedades de layout":
        animar `height` aqui custa um reflow de uma linha de texto, uma única vez,
        e é o que evita o formulário inteiro saltar quando o erro aparece.
        A alternativa — reservar espaço fixo para o erro — deixaria um vão vazio
        embaixo de todo campo. O reflow é o menor dos dois males.
        Não replique este padrão em listas ou em áreas grandes.
      */}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.span
            key={error}
            id={errorId}
            className={styles.error}
            role="alert"
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={transition.fast}
          >
            {error}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
