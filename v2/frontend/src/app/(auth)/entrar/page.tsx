"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { fadeInUp, shake, staggerContainer } from "@/lib/motion";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import styles from "./page.module.css";

/**
 * Tela de login — referência de como toda tela com formulário deve se comportar.
 *
 * Checklist aplicado aqui e esperado nas demais:
 * 1. Botão em estado de progresso durante o envio (nunca dois submits).
 * 2. Erros por campo vindos do 422 da API, ligados ao input via aria.
 * 3. Erro geral animado, com shake curto para chamar atenção sem agredir.
 * 4. Entrada escalonada dos campos, para o olho percorrer o formulário.
 * 5. Toast de confirmação antes de navegar.
 * 6. Mensagens específicas por código de erro — "algo deu errado" não ajuda ninguém.
 */
export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { login, verifyLoginCode } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  /*
   * Duas etapas na mesma rota, e não duas rotas.
   *
   * O segundo passo depende do e-mail digitado no primeiro. Numa rota separada
   * esse dado teria de viajar pela URL — expondo o e-mail no histórico do
   * navegador e nos logs de qualquer intermediário — ou por armazenamento
   * local, que sobrevive ao fim do fluxo. Mantendo em estado, ele morre com a
   * aba, e recarregar a página devolve ao começo, que é o certo: o código já
   * foi enviado, mas a senha precisa ser conferida de novo.
   */
  const [etapa, setEtapa] = useState<"credenciais" | "codigo">("credenciais");
  const [emailEmUso, setEmailEmUso] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      // Passa pelo login do AuthProvider, e não pela API direto: só ele
      // popula o usuário no contexto e agenda a renovação do token. Chamando a
      // API aqui, o token era guardado mas o contexto continuava sem usuário —
      // o /painel via "não autenticado" e devolvia para cá, com o login tendo
      // dado 200. E a sessão expirava em 15 minutos, sem renovar.
      await login(email, password);

      setEmailEmUso(email);
      setEtapa("codigo");
      toast.success("Enviamos um código de 7 dígitos para o seu e-mail.");
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("Ocorreu um erro inesperado. Tente novamente.");
        return;
      }

      if (error.isValidation) {
        setFieldErrors(error.fieldErrors);
        return;
      }

      // Mensagem específica por código: o usuário precisa saber o que fazer.
      const messages: Record<string, string> = {
        email_not_verified:
          "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada e o spam.",
        account_locked:
          "Conta temporariamente bloqueada por excesso de tentativas. Aguarde alguns minutos.",
        rate_limited: error.message,
        network_error: "Não conseguimos falar com o servidor. Verifique sua conexão.",
        timeout: "A conexão está lenta. Tente novamente.",
      };

      setFormError(messages[error.code ?? ""] ?? error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodigo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const user = await verifyLoginCode(emailEmUso, code);

      toast.success(`Bem-vindo de volta, ${user.name.split(" ")[0]}.`);

      router.push(user.role === "admin" ? "/admin" : "/painel");
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("Ocorreu um erro inesperado. Tente novamente.");
        return;
      }

      if (error.isValidation) {
        setFieldErrors(error.fieldErrors);
        return;
      }

      const messages: Record<string, string> = {
        rate_limited: error.message,
        network_error: "Não conseguimos falar com o servidor. Verifique sua conexão.",
        timeout: "A conexão está lenta. Tente novamente.",
      };

      setFormError(messages[error.code ?? ""] ?? error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function voltarParaCredenciais() {
    setEtapa("credenciais");
    setFormError(null);
    setFieldErrors({});
  }

  if (etapa === "codigo") {
    return (
      <motion.div
        className={styles.wrapper}
        variants={staggerContainer(4)}
        initial="hidden"
        animate="visible"
      >
        <motion.header className={styles.header} variants={fadeInUp}>
          <h1 className={styles.title}>Confirme que é você</h1>
          <p className={styles.subtitle}>
            Enviamos um código de 7 dígitos para <strong>{emailEmUso}</strong>. Ele vale por poucos
            minutos e só pode ser usado uma vez.
          </p>
        </motion.header>

        <form className={styles.form} onSubmit={handleCodigo} noValidate>
          <motion.div variants={fadeInUp}>
            <Input
              label="Código"
              name="code"
              /*
               * inputMode numérico levanta o teclado de números no celular, e
               * autoComplete one-time-code deixa o iOS e o Android oferecerem
               * o código direto da notificação do e-mail, sem copiar e colar.
               */
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="0000000"
              maxLength={7}
              required
              disabled={submitting}
              error={fieldErrors.code?.[0]}
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
              {submitting ? "Confirmando" : "Confirmar e entrar"}
            </Button>
          </motion.div>
        </form>

        <motion.footer className={styles.footer} variants={fadeInUp}>
          <button type="button" className={styles.linkButton} onClick={voltarParaCredenciais}>
            Usar outro e-mail
          </button>
        </motion.footer>
      </motion.div>
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
        <h1 className={styles.title}>Entrar</h1>
        <p className={styles.subtitle}>Acesse sua conta para continuar.</p>
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
            disabled={submitting}
            error={fieldErrors.email?.[0]}
          />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Input
            label="Senha"
            name="password"
            revealable
            autoComplete="current-password"
            placeholder="Sua senha"
            required
            disabled={submitting}
            error={fieldErrors.password?.[0]}
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
            {submitting ? "Entrando" : "Entrar"}
          </Button>
        </motion.div>
      </form>

      <motion.footer className={styles.footer} variants={fadeInUp}>
        <Link href="/recuperar-senha" className={styles.link}>
          Esqueci minha senha
        </Link>
        <span className={styles.divider} aria-hidden="true">
          ·
        </span>
        <Link href="/criar-conta" className={styles.link}>
          Criar conta
        </Link>
      </motion.footer>
    </motion.div>
  );
}
