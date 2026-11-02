"use client";

import { Reveal, RevealItem, RevealList } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { type Project, fetchProjects } from "@/lib/portfolio";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type Filtro = "todos" | "ar" | "codigo";

const FILTROS: ReadonlyArray<{ id: Filtro; rotulo: string }> = [
  { id: "todos", rotulo: "Todos" },
  { id: "ar", rotulo: "No ar" },
  { id: "codigo", rotulo: "Código aberto" },
];

/**
 * O filtro lê o que o projeto já tem, em vez de um campo de situação novo:
 * endereço no ar é demoUrl, código aberto é repositoryUrl. Projeto ainda em
 * construção não chega aqui — a API devolve só published = 1.
 */
function atende(projeto: Project, filtro: Filtro): boolean {
  if (filtro === "ar") {
    return projeto.demoUrl !== null;
  }

  if (filtro === "codigo") {
    return projeto.repositoryUrl !== null;
  }

  return true;
}

/**
 * Projetos, para qualquer visitante.
 *
 * A sessão deixou de ser exigida em 01/11/2026: a vitrine existe justamente
 * para quem ainda não tem conta. A busca continua acontecendo no cliente, e não
 * na renderização do servidor, porque a mesma tela mostra os atalhos do painel
 * a quem já entrou — e o token de acesso vive só na memória do navegador.
 *
 * O que segura rascunho é a API, que responde apenas com published = 1.
 * Esconder no front nunca protegeu dado nenhum.
 */
export default function ProjetosPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [projetos, setProjetos] = useState<Project[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const carregar = useCallback(async () => {
    try {
      setProjetos(await fetchProjects());
    } catch {
      setErro("Não foi possível carregar os projetos agora.");
      toast.error("Não foi possível carregar os projetos.");
    }
  }, [toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const visiveis = useMemo(
    () => (projetos ?? []).filter((projeto) => atende(projeto, filtro)),
    [projetos, filtro],
  );

  return (
    <main id="conteudo" className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.topo} aria-label="Navegação">
          <Link href="/" className={styles.topoLink}>
            <span aria-hidden="true">←</span> Home
          </Link>
          {user ? (
            <Link href="/painel" className={styles.topoLink}>
              Meu painel
            </Link>
          ) : null}
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
            {/* <output> anuncia sozinho: role="status" e aria-live são implícitos. */}
            <output className="sr-only">Carregando os projetos</output>
            <Skeleton height={260} radius="var(--radius-lg)" />
            <Skeleton height={260} radius="var(--radius-lg)" delay={80} />
          </div>
        ) : null}

        {projetos !== null && projetos.length > 1 ? (
          <Reveal>
            {/*
              fieldset, e não div com role="group": o agrupamento vira semântica
              do próprio elemento, que é o que o leitor de tela já entende sem
              depender de atributo. O reset da borda e do padding está no CSS.
            */}
            <fieldset className={styles.filtros} aria-label="Filtrar projetos">
              {FILTROS.map(({ id, rotulo }) => (
                <button
                  key={id}
                  type="button"
                  className={styles.filtro}
                  aria-pressed={filtro === id}
                  onClick={() => setFiltro(id)}
                >
                  {rotulo}
                </button>
              ))}
            </fieldset>

            {/*
              A contagem é o retorno do filtro para quem não enxerga a lista
              mudar: aria-live avisa a cada troca.
            */}
            <p className={styles.contagem} aria-live="polite">
              {visiveis.length === 1 ? "1 projeto" : `${visiveis.length} projetos`}
            </p>
          </Reveal>
        ) : null}

        {projetos !== null && projetos.length === 0 ? (
          <p className={styles.empty}>Nenhum projeto publicado ainda.</p>
        ) : null}

        {projetos !== null && projetos.length > 0 && visiveis.length === 0 ? (
          <p className={styles.empty}>Nenhum projeto com esse filtro.</p>
        ) : null}

        {visiveis.length > 0 ? (
          <RevealList itemCount={visiveis.length} className={styles.lista}>
            {visiveis.map((projeto) => (
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
            {user ? (
              <Link href="/painel" className={styles.voltar}>
                <span aria-hidden="true">←</span> Voltar ao painel
              </Link>
            ) : null}
          </div>
        </Reveal>
      </div>
    </main>
  );
}

/** Os três pontos da barra de título, que só existem como desenho. */
function PontosDaBarra() {
  return (
    <>
      <span className={styles.previaPonto} />
      <span className={styles.previaPonto} />
      <span className={styles.previaPonto} />
    </>
  );
}

/**
 * A moldura de navegador que abre o cartão.
 *
 * Dentro dela vai a primeira foto cadastrada no painel, quando existe — e é
 * por isso que a foto é opcional: captura de tela desatualizada engana mais do
 * que ajuda, então quem não tem foto mostra a moldura com o endereço, que leva
 * ao projeto funcionando. Sem foto e sem endereço, a moldura diz que não há
 * versão pública, em vez de fingir que o projeto não existe.
 *
 * Vive fora do CartaoProjeto porque são duas montagens da mesma coisa — com
 * link e sem link — e tê-las no meio do cartão fazia uma função só carregar as
 * duas, mais o estudo de caso, mais os selos.
 */
function MolduraDoProjeto({ projeto }: { projeto: Project }) {
  const capa = projeto.images[0] ?? null;
  const host = projeto.demoUrl ? new URL(projeto.demoUrl).host : null;

  /*
   * A capa é decorativa dentro do link, e informativa fora dele.
   *
   * Quando há demoUrl, o link já se anuncia por texto próprio e a imagem
   * repetiria a informação — daí alt vazio, que faz o leitor de tela pular.
   * Sem link, a foto é o único conteúdo da moldura e precisa da descrição que
   * foi exigida no painel.
   */
  const imagem =
    capa === null ? null : (
      <Image
        src={capa.url}
        alt={projeto.demoUrl ? "" : capa.alt}
        fill
        className={styles.previaFoto}
        sizes="(max-width: 640px) 100vw, 400px"
        /*
         * Servida como foi enviada, sem passar pelo otimizador do Next.
         *
         * O otimizador é um endpoint público que busca a URL que recebe, e o
         * Next 16 passou a recusar host que resolve para IP privado para que
         * ele não sirva de ponte para a rede interna de quem hospeda. A API é
         * localhost em desenvolvimento, então a alternativa seria liberar
         * justamente essa recusa — trocar uma defesa contra SSRF por conversão
         * de formato não vale a troca.
         *
         * O preço é real: a foto chega no tamanho em que foi enviada. É o
         * limite de 2 MB que o segura, e reduzir no servidor exigiria GD.
         */
        unoptimized
      />
    );

  if (projeto.demoUrl !== null) {
    return (
      <a href={projeto.demoUrl} className={styles.previa} target="_blank" rel="noopener noreferrer">
        {/*
          O conteúdo visível da prévia é todo decorativo, então o texto real
          do link vive aqui: sem ele o leitor de tela anunciaria um link sem
          nome nenhum. aria-label sozinho funcionaria, mas some quando a
          tradução automática da página troca o conteúdo — texto de verdade
          sobrevive.
        */}
        <span className="sr-only">Abrir {projeto.title} em uma nova aba</span>

        <span className={styles.previaBarra} aria-hidden="true">
          <PontosDaBarra />
          <span className={styles.previaEndereco}>{host}</span>
        </span>

        <span className={styles.previaCorpo} data-com-foto={capa !== null}>
          {imagem}
          <span className={styles.previaAbrir} aria-hidden="true">
            Ver no ar ↗
          </span>
        </span>
      </a>
    );
  }

  return (
    <div className={styles.previa}>
      <span className={styles.previaBarra} aria-hidden="true">
        <PontosDaBarra />
        <span className={styles.previaEndereco}>
          {capa === null ? "sem endereço público" : projeto.slug}
        </span>
      </span>

      <span className={styles.previaCorpo} data-com-foto={capa !== null}>
        {imagem ?? (
          <span className={styles.previaVazia} aria-hidden="true">
            Sem versão pública
          </span>
        )}
      </span>
    </div>
  );
}

/** Cartão com a moldura, o resumo, as telas e o estudo de caso. */
function CartaoProjeto({ projeto }: { projeto: Project }) {
  const temCaso = projeto.problem !== null || projeto.decisions !== null || projeto.result !== null;

  return (
    <article className={styles.projeto}>
      <MolduraDoProjeto projeto={projeto} />

      <div className={styles.projetoTexto}>
        <div className={styles.cabeca}>
          <h2 className={styles.projetoTitulo}>{projeto.title}</h2>

          <ul className={styles.selos}>
            {projeto.demoUrl ? (
              <li className={styles.selo} data-situacao="ar">
                No ar
              </li>
            ) : (
              <li className={styles.selo} data-situacao="fechado">
                Sem versão pública
              </li>
            )}
            {projeto.repositoryUrl ? (
              <li className={styles.selo} data-situacao="codigo">
                Código aberto
              </li>
            ) : null}
          </ul>
        </div>

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

        {/*
          Da segunda foto em diante. A primeira já está na moldura acima, e
          repeti-la aqui faria o cartão mostrar a mesma tela duas vezes.
          Cada miniatura carrega a descrição escrita no painel — aqui ela é
          conteúdo, não decoração, porque não há link que a explique.
        */}
        {projeto.images.length > 1 ? (
          <ul className={styles.galeria} aria-label={`Telas de ${projeto.title}`}>
            {projeto.images.slice(1).map((foto) => (
              <li key={foto.id} className={styles.galeriaItem}>
                <Image
                  src={foto.url}
                  alt={foto.alt}
                  width={132}
                  height={84}
                  className={styles.galeriaFoto}
                  sizes="132px"
                  loading="lazy"
                  unoptimized
                />
              </li>
            ))}
          </ul>
        ) : null}

        {/*
          O caso fica recolhido para que dois cartões lado a lado comecem na
          mesma altura. Quem quiser a história abre; quem está varrendo a lista
          chega aos links sem rolar três parágrafos.
        */}
        {temCaso ? (
          <details className={styles.caso}>
            <summary className={styles.casoResumo}>Problema, decisões e resultado</summary>

            <dl className={styles.casoLista}>
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
          </details>
        ) : null}

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
