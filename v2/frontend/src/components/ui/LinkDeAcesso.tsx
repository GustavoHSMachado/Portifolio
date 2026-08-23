"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

/**
 * O link do topo da home, que muda conforme quem está olhando.
 *
 * Sem isto, quem já entrou continuava vendo "Entrar" e não tinha caminho de
 * volta para o painel a não ser digitar a URL.
 *
 * A home é Server Component e não tem como saber da sessão: o refresh token é
 * um cookie httpOnly do domínio da API e o token de acesso vive só na memória
 * do navegador. Por isso este pedaço — e só ele — roda no cliente.
 *
 * Enquanto a sessão está sendo resolvida o link fica invisível, mas ocupando o
 * lugar. É meio segundo: mostrar "Entrar" e trocar para "Painel" logo depois
 * seria pior do que não mostrar nada, porque a pessoa lê e clica no que sumiu.
 */
export function LinkDeAcesso({ className }: { className?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <span className={className} aria-hidden="true" style={{ visibility: "hidden" }}>
        Entrar
      </span>
    );
  }

  if (user) {
    return (
      <Link href="/painel" className={className}>
        Meu painel
      </Link>
    );
  }

  return (
    <Link href="/entrar" className={className}>
      Entrar
    </Link>
  );
}
