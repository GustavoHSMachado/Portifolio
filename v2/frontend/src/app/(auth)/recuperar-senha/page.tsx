"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
import { fadeInUp, shake, staggerContainer } from "@/lib/motion";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import styles from "../entrar/page.module.css";

/**
 * Solicitação de redefinição de senha.
 *
 * A tela de sucesso é idêntica exista ou não o e-mail — a API responde sempre
 * a mesma coisa e a interface precisa acompanhar. Se mostrássemos "e-mail não
 * encontrado", devolveríamos ao atacante exatamente a lista de contas válidas
 * que o backend se esforça para não revelar.
 */
export default function RecuperarSenhaPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const email = String(new FormData(event.currentTarget).get("email") ?? "");

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await api.post("/api/v1/auth/forgot-password", { email }, { skipAuth: true });
      setSent(email);
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

  if (sent) {
    return (
      <motion.div
        className={`${styles.wrapper} ${styles.centered}`}
        variants={staggerContainer(3)}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeInUp} className={styles.header}>
          <div className={styles.successMark} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Enviado</title>
              <path d="M2 6h20v12H2z" />
              <path d="m22 6-10 7L2 6" />
            </svg>
          </div>

          <h1 className={styles.title}>Verifique seu e-mail</h1>
          <p className={styles.subtitle}>
            Se <strong>{sent}</strong> estiver cadastrado, o link de redefinição chega em instantes.
            Ele expira em 30 minutos e só pode ser usado uma vez.
          </p>
        </motion.div>

        <motion.p variants={fadeInUp} className={styles.note}>
          Não recebeu? Confira a caixa de spam. Se ainda assim não chegar, pode ser que a conta não
          exista com esse endereço.
        </motion.p>

        <motion.div variants={fadeInUp} className={styles.stack}>
          <Link href="/entrar" className={styles.linkButton}>
            Voltar para o login
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={styles.wrapper}
      variants={staggerContainer(4)}
      initial="hidden"
      animate="visible"
    >
      <motion.header className={styles.header} variants={fadeInUp}>
        <h1 className={styles.title}>Esqueci minha senha</h1>
        <p className={styles.subtitle}>
          Informe o e-mail da conta e enviaremos um link para criar uma nova senha.
        </p>
      </motion.header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <motion.div variants={fadeInUp}>
          <Input
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            required
            autoFocus
            disabled={submitting}
            error={fieldErrors.email?.[0]}
          />
        </motion.div>

        {formError ? (
          <motion.p
            className={styles.formError}
            variants={shake}
            initial="hidden"
            animate="visible"
            role="alert"
          >
            {formError}
          </motion.p>
        ) : null}

        <motion.div variants={fadeInUp}>
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {submitting ? "Enviando" : "Enviar link"}
          </Button>
        </motion.div>
      </form>

      <motion.footer className={styles.footer} variants={fadeInUp}>
        <Link href="/entrar" className={styles.link}>
          Voltar para o login
        </Link>
      </motion.footer>
    </motion.div>
  );
}
