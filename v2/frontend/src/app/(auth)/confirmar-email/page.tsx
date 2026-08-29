"use client";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError, api } from "@/lib/api";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import styles from "../entrar/page.module.css";

type Status = "verifying" | "success" | "expired" | "error";

function ConfirmarEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  // React 18 em StrictMode monta o efeito duas vezes; sem esta trava o token
  // de uso único seria consumido no primeiro e falharia no segundo.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!token) {
      setStatus("error");
      setMessage("O link está incompleto. Abra o e-mail e clique novamente no botão.");
      return;
    }

    void (async () => {
      try {
        await api.post("/api/v1/auth/verify-email", { token }, { skipAuth: true });
        setStatus("success");
      } catch (error) {
        if (error instanceof ApiError && (error.status === 410 || error.code === "token_invalid")) {
          setStatus("expired");
          setMessage(error.message);
          return;
        }

        setStatus("error");
        setMessage(
          error instanceof ApiError ? error.message : "Não conseguimos confirmar seu e-mail agora.",
        );
      }
    })();
  }, [token]);

  if (status === "verifying") {
    return (
      <div className={`${styles.wrapper} ${styles.centered}`} aria-busy="true">
        <Skeleton height={56} width={56} radius="var(--radius-full)" />
        <div style={{ marginTop: "var(--space-5)", display: "grid", gap: "var(--space-3)" }}>
          <Skeleton height="2rem" width="70%" />
          <Skeleton height="1rem" width="90%" delay={80} />
        </div>
        {/* <output> já anuncia: role="status" e aria-live="polite" são implícitos. */}
        <output className="sr-only">Confirmando seu e-mail</output>
      </div>
    );
  }

  const isSuccess = status === "success";

  return (
    <motion.div
      className={`${styles.wrapper} ${styles.centered}`}
      variants={staggerContainer(3)}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeInUp} className={styles.header}>
        <div className={isSuccess ? styles.successMark : styles.errorMark} aria-hidden="true">
          {isSuccess ? (
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Confirmado</title>
              <motion.path
                d="M20 6 9 17l-5-5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              />
            </motion.svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
            >
              <title>Falhou</title>
              <path d="M12 8v5M12 17h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
        </div>

        <h1 className={styles.title}>
          {isSuccess
            ? "E-mail confirmado"
            : status === "expired"
              ? "Link expirado"
              : "Não deu certo"}
        </h1>

        <p className={styles.subtitle}>
          {isSuccess ? "Sua conta está ativa. Você já pode entrar." : message}
        </p>
      </motion.div>

      <motion.div variants={fadeInUp} className={styles.stack}>
        {isSuccess ? (
          <Link href="/entrar" style={{ textDecoration: "none" }}>
            <Button size="lg" fullWidth>
              Entrar na minha conta
            </Button>
          </Link>
        ) : (
          <>
            <Link href="/criar-conta" style={{ textDecoration: "none" }}>
              <Button variant="secondary" size="lg" fullWidth>
                Solicitar novo link
              </Button>
            </Link>
            <Link href="/entrar" className={styles.linkButton}>
              Voltar para o login
            </Link>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * `useSearchParams` exige uma fronteira de Suspense no App Router — sem ela,
 * a página inteira sai do pré-render estático.
 */
export default function ConfirmarEmailPage() {
  return (
    <Suspense
      fallback={
        <div className={`${styles.wrapper} ${styles.centered}`}>
          <Skeleton height={56} width={56} radius="var(--radius-full)" />
        </div>
      }
    >
      <ConfirmarEmailContent />
    </Suspense>
  );
}
