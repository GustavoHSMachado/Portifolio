import {
  EDUCATION_LEVELS,
  type Education,
  type Experience,
  type Skill,
  fetchContentSafe,
  formatMonth,
  formatPeriod,
} from "@/lib/portfolio";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

/**
 * O currículo, em uma página feita para virar PDF.
 *
 * Server Component pelo mesmo motivo da home: o conteúdo vem do banco e precisa
 * estar no HTML entregue. E é o mesmo conteúdo — perfil, experiência, formação
 * e tecnologias já são um currículo; o que faltava era uma apresentação que
 * coubesse em papel.
 *
 * **O download entrega o PDF que o dono mantém**, e não uma versão gerada aqui.
 * Ele é diagramado à mão, tem as cinco páginas que um currículo dele precisa ter
 * e é o mesmo arquivo que ele envia por outros canais — gerar um paralelo criaria
 * duas versões para manter, que divergem no primeiro mês. Esta página é a leitura
 * rápida na web; o arquivo é o documento.
 */

/** O arquivo que o dono mantém, servido de public/. */
const ARQUIVO_DO_CURRICULO = "/curriculo-gustavo-henrique-santos-machado.pdf";

export const metadata: Metadata = {
  title: "Currículo",
  description: "Currículo de Gustavo Henrique Santos Machado.",
  /*
   * Fora dos buscadores: o conteúdo é o mesmo da home, e duas URLs com o mesmo
   * texto competem entre si no índice. A home é a versão canônica.
   */
  robots: { index: false, follow: true },
};

export default async function CurriculoPage() {
  const { profile, education, experiences, skills } = await fetchContentSafe();

  if (!profile) {
    return (
      <main id="conteudo" className={styles.pagina}>
        <p>O conteúdo do portfólio ainda não foi cadastrado.</p>
      </main>
    );
  }

  const local = [profile.city, profile.state].filter(Boolean).join(", ");

  const contatos = [
    { rotulo: "GitHub", href: profile.githubUrl },
    { rotulo: "LinkedIn", href: profile.linkedinUrl },
    { rotulo: "Site", href: profile.websiteUrl },
  ].filter((c): c is { rotulo: string; href: string } => Boolean(c.href));

  return (
    <>
      {/* Some na impressão: são os controles, não o currículo. */}
      <nav className={styles.barra} aria-label="Ações">
        <Link href="/" className={styles.voltar}>
          <span aria-hidden="true">←</span> Voltar para a home
        </Link>

        {/*
          Link com download, e não botão: é uma navegação para um arquivo, e o
          navegador sabe fazer isso sozinho. O atributo dá o nome com que ele
          chega na pasta de downloads, em vez do nome interno do arquivo.
        */}
        <a
          href={ARQUIVO_DO_CURRICULO}
          download="Curriculo - Gustavo Henrique Santos Machado.pdf"
          className={styles.imprimir}
        >
          <span aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12m0 0-4-4m4 4 4-4" />
              <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
            </svg>
          </span>
          Baixar em PDF
        </a>
      </nav>

      <main id="conteudo" className={styles.pagina}>
        <header className={styles.cabecalho}>
          <h1 className={styles.nome}>{profile.fullName}</h1>
          <p className={styles.cargo}>{profile.role}</p>

          <p className={styles.contato}>
            {local ? <span>{local}</span> : null}
            {contatos.map((c) => (
              <span key={c.rotulo}>
                {/*
                  O endereço aparece por extenso: no papel, um link clicável não
                  leva a lugar nenhum, e "GitHub" sozinho não diz qual perfil.
                */}
                {c.rotulo}: <a href={c.href}>{semProtocolo(c.href)}</a>
              </span>
            ))}
          </p>
        </header>

        <section className={styles.secao}>
          <h2 className={styles.secaoTitulo}>Resumo</h2>
          <p className={styles.resumo}>{profile.summary}</p>
        </section>

        {experiences.length > 0 ? (
          <section className={styles.secao}>
            <h2 className={styles.secaoTitulo}>Experiência profissional</h2>
            {experiences.map((item) => (
              <ItemExperiencia key={item.id} item={item} />
            ))}
          </section>
        ) : null}

        {education.length > 0 ? (
          <section className={styles.secao}>
            <h2 className={styles.secaoTitulo}>Formação</h2>
            {education.map((item) => (
              <ItemFormacao key={item.id} item={item} />
            ))}
          </section>
        ) : null}

        {skills.length > 0 ? (
          <section className={styles.secao}>
            <h2 className={styles.secaoTitulo}>Tecnologias e ferramentas</h2>
            {agruparPorCategoria(skills).map(([categoria, itens]) => (
              <p key={categoria} className={styles.categoria}>
                <span className={styles.categoriaNome}>{categoria}:</span>{" "}
                {itens.map((s) => s.name).join(" · ")}
              </p>
            ))}
          </section>
        ) : null}
      </main>
    </>
  );
}

function ItemExperiencia({ item }: { item: Experience }) {
  return (
    <article className={styles.item}>
      <div className={styles.itemTopo}>
        <h3 className={styles.itemTitulo}>{item.role}</h3>
        <span className={styles.itemPeriodo}>{formatPeriod(item.startedAt, item.endedAt)}</span>
      </div>
      <p className={styles.itemSubtitulo}>{item.company}</p>
      <p className={styles.itemTexto}>{item.description}</p>
    </article>
  );
}

function ItemFormacao({ item }: { item: Education }) {
  const nivel = EDUCATION_LEVELS[item.level] ?? item.level;

  return (
    <article className={styles.item}>
      <div className={styles.itemTopo}>
        <h3 className={styles.itemTitulo}>{item.course}</h3>
        <span className={styles.itemPeriodo}>
          {item.completedAt ? formatMonth(item.completedAt) : "em andamento"}
        </span>
      </div>
      <p className={styles.itemSubtitulo}>
        {item.institution} · {nivel}
      </p>
    </article>
  );
}

/**
 * Agrupa as tecnologias por categoria, mantendo a ordem em que apareceram.
 *
 * Uma lista corrida de dezesseis nomes não diz nada a quem lê rápido; agrupada,
 * mostra em que frentes a pessoa atua. Em papel isso importa mais ainda, porque
 * não há como filtrar nem passar o mouse.
 */
function agruparPorCategoria(skills: Skill[]): Array<[string, Skill[]]> {
  const grupos = new Map<string, Skill[]>();

  for (const skill of skills) {
    const atual = grupos.get(skill.category) ?? [];

    atual.push(skill);
    grupos.set(skill.category, atual);
  }

  return [...grupos.entries()];
}

/** O endereço sem o "https://", que é ruído numa linha de contato impressa. */
function semProtocolo(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
