"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { fadeInUp, shake, staggerContainer } from "@/lib/motion";
import styles from "../entrar/page.module.css";

/** Força da senha — heurística de feedback, não de validação. */
function strength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (password.length < 10) return { score: 0, label: "Muito curta" };

  let points = 0;
  if (password.length >= 14) points++;
  if (password.length >= 20) points++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points++;
  if (/\d/.test(password)) points++;
  if (/[^A-Za-z0-9]/.test(password)) points++;
  if (/\s/.test(password)) points++; // frases longas são ótimas senhas

  if (points <= 1) return { score: 1, label: "Fraca" };
  if (points <= 3) return { score: 2, label: "Boa" };
  return { score: 3, label: "Forte" };
}

function RedefinirSenhaContent() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const meter = strength(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await api.post(
        "/api/v1/auth/reset-password",
        {
          token,
          password: String(form.get("password") ?? ""),
          password_confirmation: String(form.get("password_confirmation") ?? ""),
        },
        { skipAuth: true },
      );

      toast.success("Senha redefinida. Entre com a nova senha.");
      router.push("/entrar");
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("Ocorreu um erro inesperado. Tente novamente.");
        return;
      }

      if (error.isValidation) {
        setFieldErrors(error.fieldErrors);
        return;
      }

      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className={`${styles.wrapper} ${styles.centered}`}>
        <div className={styles.errorMark} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <title>Link inválido</title>
            <path d="M12 8v5M12 17h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <h1 className={styles.title}>Link inválido</h1>
        <p className={styles.subtitle}>
          Abra o e-mail e clique no botão de redefinição. Se o link expirou, peça um novo.
        </p>
        <div className={styles.stack} style={{ marginTop: "var(--space-6)" }}>
          <Link href="/recuperar-senha" style={{ textDecoration: "none" }}>
            <Button size="lg" fullWidth>
              Solicitar novo link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={styles.wrapper}
      variants={staggerContainer(5)}
      initial="hidden"
      animate="visible"
    >
      <motion.header className={styles.header} variants={fadeInUp}>
        <h1 className={styles.title}>Criar nova senha</h1>
        <p className={styles.subtitle}>
          Ao salvar, todas as sessões abertas nesta conta serão encerradas.
        </p>
      </motion.header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <motion.div variants={fadeInUp}>
          <Input
            label="Nova senha"
            name="password"
            revealable
            autoComplete="new-password"
            placeholder="Mínimo de 10 caracteres"
            required
            autoFocus
            disabled={submitting}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password?.[0]}
          />

          {password ? (
            <div className={styles.meter} aria-live="polite">
              <div className={styles.meterTrack}>
                <motion.div
                  className={styles.meterFill}
                  data-score={meter.score}
                  initial={false}
                  animate={{ width: `${(meter.score / 3) * 100}%` }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className={styles.meterLabel} data-score={meter.score}>
                {meter.label}
              </span>
            </div>
          ) : null}
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Input
            label="Confirmar nova senha"
            name="password_confirmation"
            revealable
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            required
            disabled={submitting}
          />
        </motion.div>

        {formError ? (
          <motion.p className={styles.formError} variants={shake} initial="hidden" animate="visible" role="alert">
            {formError}
          </motion.p>
        ) : null}

        <motion.div variants={fadeInUp}>
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {submitting ? "Salvando" : "Salvar nova senha"}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.wrapper}>
          <Skeleton height="2.25rem" width="60%" />
        </div>
      }
    >
      <RedefinirSenhaContent />
    </Suspense>
  );
}
