"use client";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { fadeInUp, shake, staggerContainer } from "@/lib/motion";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import styles from "../entrar/page.module.css";

/**
 * Cadastro.
 *
 * Após o sucesso não navegamos: mostramos um estado de confirmação na própria
 * tela. Mandar o usuário para o login logo depois de cadastrar seria cruel —
 * ele ainda não pode entrar, precisa confirmar o e-mail antes.
 */
export default function CriarContaPage() {
  const toast = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [resending, setResending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? "").replace(/\D/g, ""),
      password: String(form.get("password") ?? ""),
      password_confirmation: String(form.get("password_confirmation") ?? ""),
      acceptedTerms: form.get("acceptedTerms") === "on",
    };

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await api.post("/api/v1/auth/register", payload, { skipAuth: true });
      setRegistered(payload.email);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("Ocorreu um erro inesperado. Tente novamente.");
        return;
      }

      // 202 significa "e-mail possivelmente já cadastrado" — a API responde
      // de forma deliberadamente ambígua para não permitir enumeração de contas.
      // Do lado do usuário legítimo, o resultado visual é o mesmo do sucesso.
      if (error.status === 202) {
        setRegistered(payload.email);
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

  async function handleResend() {
    if (!registered || resending) return;

    setResending(true);
    try {
      await api.post("/api/v1/auth/resend-verification", { email: registered }, { skipAuth: true });
      toast.success("Link reenviado. Confira sua caixa de entrada.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível reenviar agora.");
    } finally {
      setResending(false);
    }
  }

  if (registered) {
    return (
      <motion.div
        className={styles.wrapper}
        variants={staggerContainer(3)}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeInUp} className={styles.header}>
          <div className={styles.successMark} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <title>Enviado</title>
              <path d="M4 4h16v16H4z" opacity="0" />
              <path d="m22 6-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 6h20v12H2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 className={styles.title}>Confira seu e-mail</h1>
          <p className={styles.subtitle}>
            Enviamos um link de confirmação para <strong>{registered}</strong>. Ele expira em 60
            minutos.
          </p>
        </motion.div>

        <motion.p variants={fadeInUp} className={styles.note}>
          Não chegou? Verifique a caixa de spam antes de pedir outro.
        </motion.p>

        <motion.div variants={fadeInUp} className={styles.stack}>
          <Button variant="secondary" fullWidth loading={resending} onClick={handleResend}>
            Reenviar link
          </Button>
          <Link href="/entrar" className={styles.linkButton}>
            Ir para o login
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={styles.wrapper}
      variants={staggerContainer(8)}
      initial="hidden"
      animate="visible"
    >
      <motion.header className={styles.header} variants={fadeInUp}>
        <h1 className={styles.title}>Criar conta</h1>
        <p className={styles.subtitle}>Leva menos de um minuto.</p>
      </motion.header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <motion.div variants={fadeInUp}>
          <Input
            label="Nome completo"
            name="name"
            autoComplete="name"
            placeholder="Como você quer ser chamado"
            required
            disabled={submitting}
            error={fieldErrors.name?.[0]}
          />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Input
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            required
            disabled={submitting}
            error={fieldErrors.email?.[0]}
          />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Input
            label="Telefone com DDD"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="31986585208"
            hint="Apenas números, com DDD."
            required
            disabled={submitting}
            error={fieldErrors.phone?.[0]}
          />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Input
            label="Senha"
            name="password"
            revealable
            autoComplete="new-password"
            placeholder="Mínimo de 7 caracteres"
            hint="No mínimo 7 caracteres, com maiúscula, minúscula, número e símbolo."
            required
            disabled={submitting}
            error={fieldErrors.password?.[0]}
          />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Input
            label="Confirmar senha"
            name="password_confirmation"
            revealable
            autoComplete="new-password"
            placeholder="Repita a senha"
            required
            disabled={submitting}
          />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Checkbox
            name="acceptedTerms"
            required
            disabled={submitting}
            error={fieldErrors.acceptedTerms?.[0]}
            label={
              <>
                Li e aceito os{" "}
                <Link href="/legal/termos-de-uso" target="_blank">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link href="/legal/politica-de-privacidade" target="_blank">
                  Política de Privacidade
                </Link>
                .
              </>
            }
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
            {submitting ? "Criando conta" : "Criar conta"}
          </Button>
        </motion.div>
      </form>

      <motion.footer className={styles.footer} variants={fadeInUp}>
        <span className={styles.muted}>Já tem conta?</span>
        <Link href="/entrar" className={styles.link}>
          Entrar
        </Link>
      </motion.footer>
    </motion.div>
  );
}
