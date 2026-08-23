"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/hooks/useAuth";
import {
  type ContaCadastrada,
  type EventoAuditoria,
  type ResumoEvento,
  fetchAuditoria,
  fetchUsuarios,
} from "@/lib/portfolio";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";

/**
 * Acompanhamento do sistema: quem tem conta e o que aconteceu.
 *
 * Esta tela mostra dado pessoal de terceiros — e-mail, telefone, IP, horário de
 * acesso. Ela existe porque o dono do site precisa disso para operar e para
 * investigar um incidente, e o acesso é duplamente restrito: RequireAdmin no
 * servidor e o ADMIN_EMAIL amarrando a permissão a uma conta só.
 */
export default function AcessosPage() {
  const { user, loading: verificandoSessao, sairSeBarrado } = useRequireAuth({ adminOnly: true });
  const toast = useToast();

  const [contas, setContas] = useState<ContaCadastrada[] | null>(null);
  const [eventos, setEventos] = useState<EventoAuditoria[] | null>(null);
  const [resumo, setResumo] = useState<ResumoEvento[]>([]);
  const [filtro, setFiltro] = useState<string>("");

  const carregar = useCallback(
    async (evento?: string) => {
      try {
        const [usuarios, auditoria] = await Promise.all([fetchUsuarios(), fetchAuditoria(evento)]);

        setContas(usuarios.data.users);
        setEventos(auditoria.data.events);
        setResumo(auditoria.data.summary);
      } catch (error) {
        if (sairSeBarrado(error)) {
          return;
        }
        toast.error("Não foi possível carregar os registros.");
      }
    },
    [toast, sairSeBarrado],
  );

  useEffect(() => {
    if (!verificandoSessao && user) {
      void carregar(filtro || undefined);
    }
  }, [verificandoSessao, user, filtro, carregar]);

  if (verificandoSessao || !user) {
    return (
      <main id="conteudo" className={styles.page} aria-busy="true">
        <div className={styles.container}>
          <output className="sr-only">Carregando os registros</output>
          <Skeleton height="2.5rem" width="40%" />
        </div>
      </main>
    );
  }

  const totalContas = contas?.length ?? 0;
  const comLogin = contas?.filter((c) => c.lastLoginAt !== null).length ?? 0;
  const totalEventos = resumo.reduce((total, r) => total + r.total, 0);

  return (
    <main id="conteudo" className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTexto}>
            <p className={styles.eyebrow}>Painel</p>
            <h1 className={styles.title}>Acessos e registros</h1>
            <p className={styles.subtitle}>
              Quem entrou, quando e de onde — e tudo o mais que o sistema registrou.
            </p>
          </div>

          <div className={styles.headerLinks}>
            <Link href="/admin/usuarios" className={styles.link}>
              Usuários
            </Link>
            <Link href="/admin" className={styles.link}>
              Conteúdo
            </Link>
            <Link href="/" className={styles.link}>
              Home
            </Link>
          </div>
        </header>

        <section className={styles.cartoes} aria-label="Resumo">
          <div className={styles.cartao}>
            <p className={styles.cartaoNumero}>{totalContas}</p>
            <p className={styles.cartaoRotulo}>contas cadastradas</p>
          </div>
          <div className={styles.cartao}>
            <p className={styles.cartaoNumero}>{comLogin}</p>
            <p className={styles.cartaoRotulo}>já entraram pelo menos uma vez</p>
          </div>
          <div className={styles.cartao}>
            <p className={styles.cartaoNumero}>{totalEventos}</p>
            <p className={styles.cartaoRotulo}>eventos nos últimos 30 dias</p>
          </div>
        </section>

        <section className={styles.secao} aria-labelledby="eventos-titulo">
          <h2 id="eventos-titulo" className={styles.secaoTitulo}>
            Registros do sistema
          </h2>

          <div className={styles.filtros}>
            <button
              type="button"
              className={filtro === "" ? styles.filtroAtivo : styles.filtro}
              onClick={() => setFiltro("")}
            >
              Todos
            </button>
            {resumo.map((r) => (
              <button
                key={r.event}
                type="button"
                className={filtro === r.event ? styles.filtroAtivo : styles.filtro}
                onClick={() => setFiltro(r.event)}
              >
                {rotularEvento(r.event)} <span className={styles.contagem}>{r.total}</span>
              </button>
            ))}
          </div>

          {eventos === null ? (
            <Skeleton height={200} radius="var(--radius-lg)" />
          ) : eventos.length === 0 ? (
            <p className={styles.vazio}>Nenhum registro para este filtro.</p>
          ) : (
            <>
              <p className={styles.dicaRolagem}>Arraste a tabela para o lado para ver o resto.</p>
              <div className={styles.tabelaRolagem}>
                <table className={styles.tabela}>
                  <thead>
                    <tr>
                      <th scope="col">Quando</th>
                      <th scope="col">O que aconteceu</th>
                      <th scope="col">Quem</th>
                      <th scope="col">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventos.map((e) => (
                      <LinhaEvento key={e.id} evento={e} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className={styles.nota}>
            Os registros guardam o que aconteceu, nunca o segredo envolvido: senha, código de
            verificação e token de sessão não passam por aqui. Eventos com mais de 180 dias são
            apagados pelo expurgo.
          </p>
        </section>
      </div>
    </main>
  );
}

/** Um registro do sistema: quando, o quê, quem e de onde. */
function LinhaEvento({ evento }: { evento: EventoAuditoria }) {
  return (
    <tr>
      <td className={styles.quando}>{formatarData(evento.createdAt)}</td>
      <td>{rotularEvento(evento.event)}</td>
      <td>
        {evento.userName ?? "—"}
        {evento.userEmail ? <span className={styles.sub}>{evento.userEmail}</span> : null}
      </td>
      <td className={styles.origem}>{evento.ip ?? "—"}</td>
    </tr>
  );
}

/** Nome técnico do evento para algo legível na tela. */
function rotularEvento(evento: string): string {
  const nomes: Record<string, string> = {
    "login.senha_conferida": "senha conferida",
    "login.senha_incorreta": "senha incorreta",
    "login.concluido": "entrou",
    "login.codigo_incorreto": "código incorreto",
    logout: "saiu",
    "conta.bloqueada": "conta bloqueada",
    "conta.cadastrada": "cadastro",
    "conta.email_confirmado": "e-mail confirmado",
    "conta.senha_redefinida": "senha redefinida",
    "conta.senha_alterada": "senha alterada",
    "conta.reset_solicitado": "pediu recuperação",
    "sessao.reuso_detectado": "reuso de sessão detectado",
    "conteudo.salvo": "conteúdo salvo",
    "conteudo.excluido": "conteúdo excluído",
    "mensagem.recebida": "mensagem recebida",
  };

  return nomes[evento] ?? evento;
}

function formatarData(valor: string | null): string {
  if (!valor) return "nunca";

  // O banco devolve "AAAA-MM-DD HH:MM:SS"; trocar o espaço pelo T é o que o
  // Date entende sem depender do fuso do navegador interpretar errado.
  const data = new Date(valor.replace(" ", "T"));

  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
