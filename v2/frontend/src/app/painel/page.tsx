"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useRequireAuth } from "@/hooks/useAuth";
import { ApiError, api } from "@/lib/api";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import styles from "./page.module.css";

export default function PainelPage() {
  const { user, loading } = useRequireAuth();
  const { logout, refreshUser } = useAuth();
  const toast = useToast();

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string[]>>({});

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingProfile) return;

    const form = new FormData(event.currentTarget);

    setSavingProfile(true);
    setProfileErrors({});

    try {
      await api.put("/api/v1/me", {
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? "").replace(/\D/g, ""),
      });

      await refreshUser();

      // Confirmação no próprio botão, além do toast: o olho do usuário está no
      // botão que ele acabou de clicar, não no canto da tela.
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
      toast.success("Dados atualizados.");
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) {
        setProfileErrors(error.fieldErrors);
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changingPassword) return;

    const form = new FormData(event.currentTarget);

    setChangingPassword(true);
    setPasswordErrors({});
    setPasswordError(null);

    try {
      await api.post("/api/v1/auth/change-password", {
        currentPassword: String(form.get("currentPassword") ?? ""),
        password: String(form.get("password") ?? ""),
        password_confirmation: String(form.get("password_confirmation") ?? ""),
      });

      setPasswordOpen(false);
      toast.success("Senha alterada. Entre novamente com a nova senha.");
      // A troca de senha revoga todas as sessões no servidor — o estado local
      // precisa acompanhar, senão a interface finge que ainda está logada.
      await logout();
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) {
        setPasswordErrors(error.fieldErrors);
        return;
      }
      setPasswordError(
        error instanceof ApiError ? error.message : "Não foi possível alterar a senha.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading || !user) {
    return (
      <div className={styles.page} aria-busy="true">
        {/* <output> anuncia sozinho: role="status" e aria-live="polite" são implícitos. */}
        <output className="sr-only">Carregando seu painel</output>
        <div className={styles.container}>
          <Skeleton height="2.5rem" width="45%" />
          <div style={{ marginTop: "var(--space-6)", display: "grid", gap: "var(--space-5)" }}>
            <Skeleton height={200} radius="var(--radius-lg)" />
            <Skeleton height={140} radius="var(--radius-lg)" delay={100} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.container}
        variants={staggerContainer(4)}
        initial="hidden"
        animate="visible"
      >
        <motion.header className={styles.header} variants={fadeInUp}>
          <div>
            <p className={styles.eyebrow}>Sua conta</p>
            <h1 className={styles.title}>Olá, {user.name.split(" ")[0]}</h1>
          </div>

          <div className={styles.headerActions}>
            {user.role === "admin" ? (
              <Link href="/admin" className={styles.adminLink}>
                Painel admin
              </Link>
            ) : null}
            <Button variant="ghost" onClick={() => void logout()}>
              Sair
            </Button>
          </div>
        </motion.header>

        {!user.emailVerified ? (
          <motion.output className={styles.warning} variants={fadeInUp}>
            <strong>Confirme seu e-mail.</strong> Algumas ações ficam bloqueadas até a confirmação.
          </motion.output>
        ) : null}

        <motion.section className={styles.card} variants={fadeInUp}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Dados pessoais</h2>
            <p className={styles.cardSubtitle}>Atualize seu nome e telefone.</p>
          </header>

          <form className={styles.form} onSubmit={handleProfile} noValidate>
            <Input
              label="Nome completo"
              name="name"
              defaultValue={user.name}
              autoComplete="name"
              required
              disabled={savingProfile}
              error={profileErrors.name?.[0]}
            />

            <Input
              label="Telefone"
              name="phone"
              type="tel"
              inputMode="numeric"
              defaultValue={user.phone ?? ""}
              autoComplete="tel"
              hint="Apenas números, com DDD."
              required
              disabled={savingProfile}
              error={profileErrors.phone?.[0]}
            />

            <div className={styles.readOnly}>
              <span className={styles.readOnlyLabel}>E-mail</span>
              <span className={styles.readOnlyValue}>{user.email}</span>
              <span className={styles.readOnlyHint}>
                O e-mail é a identidade da conta e não pode ser alterado por aqui.
              </span>
            </div>

            <div className={styles.formActions}>
              <Button type="submit" loading={savingProfile} success={profileSaved}>
                {profileSaved ? "Salvo" : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </motion.section>

        <motion.section className={styles.card} variants={fadeInUp}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Segurança</h2>
            <p className={styles.cardSubtitle}>
              Ao trocar a senha, todas as sessões abertas são encerradas.
            </p>
          </header>

          <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
            Alterar senha
          </Button>
        </motion.section>
      </motion.div>

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Alterar senha">
        <form id="password-form" className={styles.form} onSubmit={handlePassword} noValidate>
          <Input
            label="Senha atual"
            name="currentPassword"
            revealable
            autoComplete="current-password"
            required
            disabled={changingPassword}
            error={passwordErrors.currentPassword?.[0]}
          />

          <Input
            label="Nova senha"
            name="password"
            revealable
            autoComplete="new-password"
            hint="Mínimo de 10 caracteres."
            required
            disabled={changingPassword}
            error={passwordErrors.password?.[0]}
          />

          <Input
            label="Confirmar nova senha"
            name="password_confirmation"
            revealable
            autoComplete="new-password"
            required
            disabled={changingPassword}
          />

          {passwordError ? (
            <p className={styles.modalError} role="alert">
              {passwordError}
            </p>
          ) : null}

          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPasswordOpen(false)}
              disabled={changingPassword}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={changingPassword}>
              {changingPassword ? "Alterando" : "Alterar senha"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
