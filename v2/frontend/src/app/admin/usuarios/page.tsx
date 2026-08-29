"use client";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import {
  type ContaCadastrada,
  bloquearConta,
  excluirConta,
  fetchUsuarios,
  liberarConta,
} from "@/lib/portfolio";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";

/**
 * Gestão das contas do site.
 *
 * As três ações são deliberadamente poucas. Bloquear e liberar resolvem o caso
 * real — alguém abusando do formulário, ou uma conta travada por senha errada
 * que precisa voltar antes dos quinze minutos. Excluir atende ao pedido de
 * remoção de dados. Editar nome, e-mail ou papel de outra pessoa ficou de fora:
 * seria o administrador reescrevendo o cadastro alheio, e nenhuma delas é uma
 * necessidade deste site.
 *
 * Quem protege de verdade é o servidor: RequireAdmin nas rotas, e o
 * alvoGerenciavel recusando a própria conta e a do ADMIN_EMAIL.
 */
export default function UsuariosPage() {
  const { user, loading: verificandoSessao, sairSeBarrado } = useRequireAuth({ adminOnly: true });
  const toast = useToast();

  const [contas, setContas] = useState<ContaCadastrada[] | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetchUsuarios();

      setContas(resposta.data.users);
    } catch (error) {
      if (sairSeBarrado(error)) {
        return;
      }
      toast.error("Não foi possível carregar as contas.");
    }
  }, [toast, sairSeBarrado]);

  useEffect(() => {
    if (!verificandoSessao && user) {
      void carregar();
    }
  }, [verificandoSessao, user, carregar]);

  if (verificandoSessao || !user) {
    return (
      <main id="conteudo" className={styles.page} aria-busy="true">
        <div className={styles.container}>
          <output className="sr-only">Carregando as contas</output>
          <Skeleton height="2.5rem" width="40%" />
        </div>
      </main>
    );
  }

  const ativas = contas?.filter((c) => !c.deleted) ?? [];
  const bloqueadas = ativas.filter((c) => c.locked).length;
  const semConfirmar = ativas.filter((c) => !c.emailVerified).length;

  return (
    <main id="conteudo" className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTexto}>
            <p className={styles.eyebrow}>Painel</p>
            <h1 className={styles.title}>Usuários</h1>
            <p className={styles.subtitle}>
              Quem tem conta no site, com o que é preciso para bloquear, liberar ou remover.
            </p>
          </div>

          <div className={styles.headerLinks}>
            <Link href="/admin/acessos" className={styles.link}>
              Registros
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
            <p className={styles.cartaoNumero}>{ativas.length}</p>
            <p className={styles.cartaoRotulo}>contas ativas</p>
          </div>
          <div className={styles.cartao}>
            <p className={styles.cartaoNumero}>{semConfirmar}</p>
            <p className={styles.cartaoRotulo}>sem confirmar o e-mail</p>
          </div>
          <div className={styles.cartao}>
            <p className={styles.cartaoNumero}>{bloqueadas}</p>
            <p className={styles.cartaoRotulo}>bloqueadas</p>
          </div>
        </section>

        <section aria-labelledby="contas-titulo">
          <h2 id="contas-titulo" className={styles.secaoTitulo}>
            Contas
          </h2>

          <dl className={styles.legenda}>
            <div className={styles.legendaItem}>
              <dt className={styles.legendaTermo}>Bloquear</dt>
              <dd className={styles.legendaTexto}>
                A conta continua existindo, mas ninguém entra nela. Vale até você liberar.
              </dd>
            </div>
            <div className={styles.legendaItem}>
              <dt className={styles.legendaTermo}>Liberar</dt>
              <dd className={styles.legendaTexto}>
                Desfaz o bloqueio — o seu ou o automático, depois de cinco senhas erradas.
              </dd>
            </div>
            <div className={styles.legendaItem}>
              <dt className={styles.legendaTermo}>Excluir</dt>
              <dd className={styles.legendaTexto}>
                Apaga nome, e-mail e telefone e encerra o acesso. Pede confirmação e não tem volta.
              </dd>
            </div>
          </dl>

          {contas === null ? (
            <Skeleton height={220} radius="var(--radius-lg)" />
          ) : contas.length === 0 ? (
            <p className={styles.vazio}>Nenhuma conta cadastrada ainda.</p>
          ) : (
            <>
              <p className={styles.dicaRolagem}>Arraste a tabela para o lado para ver o resto.</p>
              <div className={styles.tabelaRolagem}>
                <table className={styles.tabela}>
                  <thead>
                    <tr>
                      <th scope="col">Pessoa</th>
                      <th scope="col">Telefone</th>
                      <th scope="col">Papel</th>
                      <th scope="col">Último acesso</th>
                      <th scope="col">Cadastro</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contas.map((c) => (
                      <LinhaConta
                        key={c.id}
                        conta={c}
                        ehVoce={c.id === user.id}
                        onMudou={carregar}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className={styles.nota}>
            Excluir não apaga a linha: o nome, o e-mail e o telefone são substituídos e o restante
            do cadastro fica. É o que mantém de pé o histórico de acessos daquela conta, que sem a
            linha ficaria órfão — e o login já é impossível a partir do momento da exclusão.
          </p>
        </section>
      </div>
    </main>
  );
}

function LinhaConta({
  conta,
  ehVoce,
  onMudou,
}: {
  conta: ContaCadastrada;
  ehVoce: boolean;
  onMudou: () => Promise<void>;
}) {
  return (
    <tr>
      <td>
        {conta.name}
        {ehVoce ? <span className={styles.marca}>você</span> : null}
        {conta.deleted ? <span className={styles.marca}>excluída</span> : null}
        {conta.locked ? <span className={styles.marcaAlerta}>bloqueada</span> : null}
        <span className={styles.sub}>
          {conta.email}
          {conta.emailVerified ? null : <span className={styles.marcaAlerta}>não confirmado</span>}
        </span>
      </td>
      <td>{conta.phone ?? "—"}</td>
      <td>{conta.role === "admin" ? "administrador" : "usuário"}</td>
      <td>{formatarData(conta.lastLoginAt)}</td>
      <td>{formatarData(conta.createdAt)}</td>
      <td>
        <Acoes conta={conta} ehVoce={ehVoce} onMudou={onMudou} />
      </td>
    </tr>
  );
}

/**
 * As ações de uma linha.
 *
 * Conta excluída e a sua própria não têm botão: o servidor recusaria de todo
 * jeito, e oferecer um clique que só resulta em erro é desenho ruim.
 */
function Acoes({
  conta,
  ehVoce,
  onMudou,
}: {
  conta: ContaCadastrada;
  ehVoce: boolean;
  onMudou: () => Promise<void>;
}) {
  const toast = useToast();
  const [emCurso, setEmCurso] = useState<"acesso" | "exclusao" | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  if (ehVoce || conta.deleted) {
    return <span className={styles.semAcao}>—</span>;
  }

  async function alternarAcesso() {
    setEmCurso("acesso");

    try {
      if (conta.locked) {
        await liberarConta(conta.id);
        toast.success("Conta liberada.");
      } else {
        await bloquearConta(conta.id);
        toast.success("Conta bloqueada.");
      }

      await onMudou();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível concluir.");
    } finally {
      setEmCurso(null);
    }
  }

  // Dois cliques para excluir, como no painel de conteúdo: a confirmação é o
  // próprio botão mudando, sem diálogo que interrompa quem está varrendo a lista.
  async function excluir() {
    if (!confirmando) {
      setConfirmando(true);

      return;
    }

    setEmCurso("exclusao");

    try {
      await excluirConta(conta.id);
      await onMudou();
      toast.success("Conta excluída.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível excluir.");
      setEmCurso(null);
      setConfirmando(false);
    }
  }

  return (
    <div className={styles.acoes}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={emCurso === "acesso"}
        onClick={() => void alternarAcesso()}
      >
        {conta.locked ? "Liberar" : "Bloquear"}
      </Button>

      <Button
        type="button"
        variant={confirmando ? "danger" : "ghost"}
        size="sm"
        loading={emCurso === "exclusao"}
        onClick={() => void excluir()}
      >
        {confirmando ? "Confirmar exclusão" : "Excluir"}
      </Button>
    </div>
  );
}

function formatarData(valor: string | null): string {
  if (!valor) return "nunca";

  // O banco devolve "AAAA-MM-DD HH:MM:SS"; trocar o espaço pelo T é o que o
  // Date entende sem depender do navegador adivinhar o formato.
  const data = new Date(valor.replace(" ", "T"));

  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
