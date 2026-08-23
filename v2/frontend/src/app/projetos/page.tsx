"use client";

import { Reveal, RevealItem, RevealList } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { type Project, fetchProjects } from "@/lib/portfolio";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";

/**
 * Projetos, para quem tem sessão.
 *
 * A busca acontece no cliente, e não na renderização do servidor: o token de
 * acesso vive na memória do navegador — nunca em cookie legível nem em
 * armazenamento local —, e o servidor que monta a página não o alcança.
 *
 * O acesso de verdade é verificado pela API, que responde 401 sem sessão. O
 * useRequireAuth aqui é conveniência de navegação: esconder a tela no front
 * nunca protegeu endpoint nenhum.
 */
export default function ProjetosPage() {
  const { user, loading: verificandoSessao } = useRequireAuth();
  const toast = useToast();

  const [projetos, setProjetos] = useState<Project[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setProjetos(await fetchProjects());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return; // o useRequireAuth já está levando para o login
      }

      setErro("Não foi possível carregar os projetos agora.");
      toast.error("Não foi possível carregar os projetos.");
    }
  }, [toast]);

  useEffect(() => {
    if (!verificandoSessao && user) {
      void carregar();
    }
  }, [verificandoSessao, user, carregar]);

  if (verificandoSessao || !user) {
    return (
      <main id="conteudo" className={styles.page} aria-busy="true">
        <div className={styles.container}>
          {/* <output> anuncia sozinho: role="status" e aria-live são implícitos. */}
          <output className="sr-only">Carregando os projetos</output>
          <Skeleton height="2.5rem" width="40%" />
        </div>
      </main>
    );
  }

  return (
    <main id="conteudo" className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.topo} aria-label="Navegação">
          <Link href="/" className={styles.topoLink}>
            <span aria-hidden="true">←</span> Home
          </Link>
          <Link href="/painel" className={styles.topoLink}>
            Meu painel
          </Link>
        </nav>

        <header className={styles.header}>
          <p className={styles.eyebrow}>Projetos</p>
          <h1 className={styles.title}>O que eu construí</h1>
          <p className={styles.subtitle}>
            Cada projeto traz o problema que apareceu, as decisões que tomei e o resultado. Onde
            houver versão no ar, o link abre o projeto funcionando.
          </p>
        </header>

        {erro ? (
          <p className={styles.empty} role="alert">
            {erro}
          </p>
        ) : null}

        {projetos === null && !erro ? (
          <div className={styles.lista}>
            <Skeleton height={260} radius="var(--radius-lg)" />
            <Skeleton height={260} radius="var(--radius-lg)" delay={80} />
          </div>
        ) : null}

        {projetos !== null && projetos.length === 0 ? (
          <p className={styles.empty}>Nenhum projeto publicado ainda.</p>
        ) : null}

        {projetos !== null && projetos.length > 0 ? (
          <RevealList itemCount={projetos.length} className={styles.lista}>
            {projetos.map((projeto) => (
              <RevealItem key={projeto.id}>
                <CartaoProjeto projeto={projeto} />
              </RevealItem>
            ))}
          </RevealList>
        ) : null}

        <Reveal>
          <div className={styles.rodapeLinks}>
            <Link href="/" className={styles.voltar}>
              <span aria-hidden="true">←</span> Voltar para a home
            </Link>
            <Link href="/painel" className={styles.voltar}>
              <span aria-hidden="true">←</span> Voltar ao painel
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}

/**
 * Cartão com prévia e acesso ao projeto no ar.
 *
 * A prévia é a moldura do site em miniatura, com o endereço na barra: uma
 * imagem estática de cada projeto exigiria manter captura de tela atualizada a
 * cada mudança, e uma desatualizada engana mais do que ajuda. O que interessa a
 * quem lê é chegar ao projeto funcionando, e é isso que o cartão entrega.
 */
function CartaoProjeto({ projeto }: { projeto: Project }) {
  const host = projeto.demoUrl ? new URL(projeto.demoUrl).host : null;

  return (
    <article className={styles.projeto}>
      {projeto.demoUrl ? (
        <a
          href={projeto.demoUrl}
          className={styles.previa}
          target="_blank"
          rel="noopener noreferrer"
        >
          {/*
            O conteúdo visível da prévia é todo decorativo, então o texto real
            do link vive aqui: sem ele o leitor de tela anunciaria um link sem
            nome nenhum. aria-label sozinho funcionaria, mas some quando a
            tradução automática da página troca o conteúdo — texto de verdade
            sobrevive.
          */}
          <span className="sr-only">Abrir {projeto.title} em uma nova aba</span>

          <span className={styles.previaBarra} aria-hidden="true">
            <span className={styles.previaPonto} />
            <span className={styles.previaPonto} />
            <span className={styles.previaPonto} />
            <span className={styles.previaEndereco}>{host}</span>
          </span>

          <span className={styles.previaCorpo} aria-hidden="true">
            <span className={styles.previaAbrir}>Ver no ar ↗</span>
          </span>
        </a>
      ) : null}

      <div className={styles.projetoTexto}>
        <h2 className={styles.projetoTitulo}>{projeto.title}</h2>
        <p className={styles.projetoResumo}>{projeto.summary}</p>

        {projeto.stack.length > 0 ? (
          <ul className={styles.stack} aria-label="Tecnologias">
            {projeto.stack.map((tech) => (
              <li key={tech} className={styles.tech}>
                {tech}
              </li>
            ))}
          </ul>
        ) : null}

        <dl className={styles.caso}>
          {projeto.problem ? (
            <div>
              <dt>Problema</dt>
              <dd>{projeto.problem}</dd>
            </div>
          ) : null}
          {projeto.decisions ? (
            <div>
              <dt>Decisões</dt>
              <dd>{projeto.decisions}</dd>
            </div>
          ) : null}
          {projeto.result ? (
            <div>
              <dt>Resultado</dt>
              <dd>{projeto.result}</dd>
            </div>
          ) : null}
        </dl>

        <div className={styles.links}>
          {projeto.demoUrl ? (
            <a href={projeto.demoUrl} target="_blank" rel="noopener noreferrer">
              Acessar o projeto
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          ) : null}
          {projeto.repositoryUrl ? (
            <a href={projeto.repositoryUrl} target="_blank" rel="noopener noreferrer">
              Ver o código
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
