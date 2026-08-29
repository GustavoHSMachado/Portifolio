"use client";

import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useState } from "react";
import estilos from "./LinkDeAcesso.module.css";

/**
 * O canto superior da home, que muda conforme quem está olhando.
 *
 * Deslogado, é o convite para entrar. Logado, responde três coisas de uma vez:
 * em qual conta a pessoa está, como chegar ao painel e como sair. Antes só
 * dizia "Entrar", mesmo para quem já tinha entrado.
 *
 * A home é Server Component e não tem como saber da sessão: o refresh token é
 * um cookie httpOnly do domínio da API e o token de acesso vive só na memória
 * do navegador. Por isso este pedaço — e só ele — roda no cliente.
 *
 * Enquanto a sessão está sendo resolvida o bloco fica invisível, mas ocupando o
 * lugar. É meio segundo: mostrar "Entrar" e trocar para o nome logo depois
 * seria pior do que não mostrar nada, porque a pessoa lê e clica no que sumiu.
 */
export function LinkDeAcesso({ className }: { className?: string }) {
  const { user, loading, logout } = useAuth();
  const toast = useToast();
  const [saindo, setSaindo] = useState(false);

  if (loading) {
    return (
      <span className={className} aria-hidden="true" style={{ visibility: "hidden" }}>
        Entrar
      </span>
    );
  }

  if (!user) {
    return (
      <Link href="/entrar" className={className}>
        Entrar
      </Link>
    );
  }

  async function sair() {
    setSaindo(true);

    try {
      await logout();
      toast.success("Você saiu da sua conta.");
    } finally {
      // Sem voltar o estado: o logout local acontece mesmo se o servidor falhar,
      // e o componente já vai ser trocado pelo link de entrar.
      setSaindo(false);
    }
  }

  return (
    <div className={estilos.acesso}>
      <p className={estilos.saudacao}>
        Olá, <span className={estilos.nome}>{primeiroNome(user.name)}</span>
      </p>

      <Link href="/painel" className={className}>
        Meu painel
      </Link>

      <button type="button" className={estilos.sair} onClick={() => void sair()} disabled={saindo}>
        {saindo ? "Saindo…" : "Sair"}
      </button>
    </div>
  );
}

/**
 * Só o primeiro nome, como no painel.
 *
 * Nome completo numa barra estreita quebra a linha ou empurra os botões para
 * fora, e quem está lendo já sabe o resto do próprio nome.
 */
function primeiroNome(nomeCompleto: string): string {
  return nomeCompleto.trim().split(" ")[0] ?? nomeCompleto;
}
