"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { fadeInUp, shake, staggerContainer } from "@/lib/motion";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const toast = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  /*
   * O fluxo inteiro cabe nesta rota, em duas etapas: pedir o código e usá-lo.
   *
   * Antes a segunda etapa vivia em /redefinir-senha e recebia um token de 64
   * caracteres pela URL. Com um código de 7 dígitos, mandá-lo pela URL seria
   * pior em tudo: ele apareceria no histórico do navegador, no Referer e em
   * qualquer log de intermediário. Mantendo as duas etapas aqui, nem o e-mail
   * nem o código saem do estado da página — e ninguém precisa digitar o
   * endereço duas vezes.
   */
  async function handleCodigo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || sent === null) return;

    const form = new FormData(event.currentTarget);

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await api.post(
        "/api/v1/auth/reset-password",
        {
          email: sent,
          code: String(form.get("code") ?? "").trim(),
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
            Se <strong>{sent}</strong> estiver cadastrado, um código de 7 dígitos chega em
            instantes. Ele expira em poucos minutos e só pode ser usado uma vez.
          </p>
        </motion.div>

        <form className={styles.form} onSubmit={handleCodigo} noValidate>
          <motion.div variants={fadeInUp}>
            <Input
              label="Código recebido"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              // Mesmo motivo do campo em /entrar: gerenciador de senha ignora o
              // autocomplete e preenche com o e-mail salvo.
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
              placeholder="0000000"
              maxLength={7}
              required
              disabled={submitting}
              error={fieldErrors.code?.[0]}
            />
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Input
              label="Nova senha"
              name="password"
              revealable
              autoComplete="new-password"
              hint="Mínimo de 7 caracteres, com maiúscula, minúscula, número e símbolo."
              required
              disabled={submitting}
              error={fieldErrors.password?.[0]}
            />
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Input
              label="Confirmar nova senha"
              name="password_confirmation"
              revealable
              autoComplete="new-password"
              required
              disabled={submitting}
              error={fieldErrors.password_confirmation?.[0]}
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
              {submitting ? "Salvando" : "Salvar nova senha"}
            </Button>
          </motion.div>
        </form>

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
