"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

/**
 * O caminho para os projetos.
 *
 * Até 01/11/2026 a porta era o login, e o botão mudava conforme a sessão.
 * Agora a vitrine é pública e o destino é sempre o mesmo; o convite para criar
 * conta continua, como apoio, para quem ainda não tem — a conta serve ao
 * painel e às mensagens, não aos projetos.
 *
 * Segue cliente por causa desse convite: a home é renderizada no servidor e a
 * sessão só existe no navegador.
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

  return (
    <>
      <Link href="/projetos" className={className}>
        Ver os projetos
      </Link>
      {classNameSecundaria && !loading && !user ? (
        <Link href="/criar-conta" className={classNameSecundaria}>
          Criar conta
        </Link>
      ) : null}
    </>
  );
}

/**
 * A explicação que acompanha o botão.
 *
 * O texto deixou de depender da sessão junto com o botão: não há mais nada a
 * destravar, então não há mais dois recados a dar.
 */
export function TextoProjetos({ className }: { className?: string }) {
  return (
    <p className={className}>
      Cada um traz o problema que apareceu, as decisões que tomei e o resultado, com link para ver o
      projeto no ar.
    </p>
  );
}
