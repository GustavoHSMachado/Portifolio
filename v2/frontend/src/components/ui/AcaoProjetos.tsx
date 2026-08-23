"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

/**
 * O caminho para os projetos, escrito conforme quem está olhando.
 *
 * Quem não entrou precisa saber que a porta é o login; quem já entrou não
 * precisa ver "Entrar" de novo — precisa do atalho para os projetos.
 *
 * Mesmo motivo do LinkDeAcesso para ser cliente: a home é renderizada no
 * servidor e a sessão só existe no navegador.
 */
export function AcaoProjetos({
  className,
  classNameSecundaria,
}: {
  className?: string;
  /** Botão de apoio, mostrado só a quem ainda não tem conta. */
  classNameSecundaria?: string;
}) {
  const { user, loading } = useAuth();

  // Espaço reservado com o texto mais longo, para o bloco não pular de tamanho
  // quando a sessão terminar de resolver.
  if (loading) {
    return (
      <span className={className} aria-hidden="true" style={{ visibility: "hidden" }}>
        Entrar para ver os projetos
      </span>
    );
  }

  if (user) {
    return (
      <Link href="/projetos" className={className}>
        Ver os projetos
      </Link>
    );
  }

  return (
    <>
      <Link href="/entrar" className={className}>
        Entrar para ver os projetos
      </Link>
      {classNameSecundaria ? (
        <Link href="/criar-conta" className={classNameSecundaria}>
          Criar conta
        </Link>
      ) : null}
    </>
  );
}

/**
 * A explicação que acompanha o botão, pelo mesmo motivo dele.
 *
 * Deixar o texto fixo no servidor produzia a incoerência de convidar a entrar
 * logo acima de um botão escrito "Ver os projetos" — para alguém que já tinha
 * entrado.
 */
export function TextoProjetos({ className }: { className?: string }) {
  const { user, loading } = useAuth();

  const comum =
    "Cada um traz o problema que apareceu, as decisões que tomei e o resultado, com link para ver o projeto no ar.";

  return (
    <p className={className} style={loading ? { visibility: "hidden" } : undefined}>
      {comum}{" "}
      {user
        ? "Você já está na sua conta — é só abrir."
        : "Para abrir, entre com sua conta — leva menos de um minuto criar uma."}
    </p>
  );
}
