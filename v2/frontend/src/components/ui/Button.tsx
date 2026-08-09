"use client";

import { motion } from "framer-motion";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { pressable, transition } from "@/lib/motion";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<ComponentPropsWithoutRef<"button">, "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"> {
  variant?: Variant;
  size?: Size;
  /** Mostra spinner, desabilita o clique e preserva a largura do botão. */
  loading?: boolean;
  /** Confirmação de sucesso momentânea, para ações que não navegam. */
  success?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

/**
 * Botão com estado de progresso embutido.
 *
 * Três decisões que evitam o efeito "amador":
 *
 * 1. O rótulo continua ocupando espaço durante o loading (visibility: hidden),
 *    então o botão não encolhe e o layout não pula.
 * 2. O spinner entra com fade, não aparece de estalo.
 * 3. `aria-busy` e `aria-disabled` mantêm leitores de tela informados —
 *    feedback visual sem equivalente acessível é meio trabalho.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    success = false,
    fullWidth = false,
    iconLeft,
    iconRight,
    children,
    disabled,
    className,
    ...props
  },
  ref,
) {
  const isBlocked = loading || disabled;

  return (
    <motion.button
      ref={ref}
      type={props.type ?? "button"}
      className={[
        styles.button,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : "",
        loading ? styles.loading : "",
        success ? styles.success : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={isBlocked}
      aria-busy={loading}
      aria-disabled={isBlocked}
      {...(isBlocked ? {} : pressable)}
      transition={transition.fast}
      {...props}
    >
      <span className={styles.content} data-hidden={loading || success}>
        {iconLeft ? <span className={styles.icon}>{iconLeft}</span> : null}
        {children}
        {iconRight ? <span className={styles.icon}>{iconRight}</span> : null}
      </span>

      {loading ? (
        <motion.span
          className={styles.spinner}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={transition.fast}
          // Mantém o loop vivo sob prefers-reduced-motion — ver tokens.css
          data-motion-loop=""
          aria-hidden="true"
        />
      ) : null}

      {success && !loading ? (
        <motion.svg
          className={styles.check}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          aria-hidden="true"
        >
          <motion.path
            d="M20 6 9 17l-5-5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.svg>
      ) : null}
    </motion.button>
  );
});
