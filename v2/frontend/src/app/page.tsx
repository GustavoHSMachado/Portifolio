import { Reveal, RevealItem, RevealList } from "@/components/motion/Reveal";
import { AcaoProjetos, TextoProjetos } from "@/components/ui/AcaoProjetos";
import { ContactForm } from "@/components/ui/ContactForm";
import { LinkDeAcesso } from "@/components/ui/LinkDeAcesso";
import { SkillIcon } from "@/components/ui/SkillIcon";
import {
  EDUCATION_LEVELS,
  type Education,
  type Experience,
  type Profile,
  type Skill,
  fetchContentSafe,
  formatMonth,
  formatPeriod,
} from "@/lib/portfolio";
import { buildPersonJsonLd, serializeJsonLd } from "@/lib/structured-data";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

/**
 * Home do portfólio.
 *
 * Server Component de propósito: o conteúdo precisa estar no HTML entregue,
 * não aparecer depois que o JavaScript rodar. É o que permite a um buscador
 * ler o portfólio e o que encurta o tempo até a primeira pintura.
 */

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await fetchContentSafe();

  if (!profile) {
    return { title: "Portfólio" };
  }

  const description = profile.summary.slice(0, 155);

  const title = `${profile.fullName} — ${profile.role}`;

  return {
    title,
    description,
    /* Canonical absoluto: sem ele, o mesmo conteúdo servido em www e sem www,
       ou com parâmetro de campanha na URL, conta como páginas diferentes. */
    alternates: { canonical: "/" },
    openGraph: { title, description, type: "profile", url: "/" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HomePage() {
  const { profile, education, experiences, skills, projectCount } = await fetchContentSafe();

  if (!profile) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.empty}>O conteúdo do portfólio ainda não foi cadastrado.</p>
        </main>
      </div>
    );
  }

  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  // Sem projetos: eles saíram do conteúdo público e não podem ser anunciados
  // como dados estruturados de uma página onde não estão visíveis.
  const jsonLd = buildPersonJsonLd({ profile, education, experiences, skills });

  return (
    <div className={styles.page}>
      {/* JSON-LD no corpo, e não no <head>: o Next só aceita metadata declarada em
          `metadata`, e dados estruturados são válidos em qualquer ponto do
          documento. Ver serializeJsonLd para o tratamento do "<" no conteúdo. */}
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD exige script inline; o valor é JSON escapado por serializeJsonLd.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/*
        Antes não havia caminho nenhum para o login a partir do site: só quem
        digitasse /entrar na barra de endereços chegava lá. Com os projetos
        atrás da sessão, isso deixou de ser um detalhe.
      */}
      <nav className={styles.topBar} aria-label="Acesso">
        <LinkDeAcesso className={styles.topLink} />
      </nav>

      <header className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div>
            {/*
              O nome é o h1, e não a frase de efeito que ficava aqui.
              Toda página precisa de um título principal — é por ele que o
              leitor de tela anuncia onde a pessoa está, e é o que o buscador
              lê como assunto da página. Num portfólio pessoal, esse assunto é
              a pessoa: quem procura por "Gustavo Henrique Santos Machado"
              encontra o site pelo próprio nome.
            */}
            <p className={styles.eyebrow}>{profile.role}</p>
            <h1 className={styles.title}>{profile.fullName}</h1>
            <p className={styles.lead}>{profile.summary}</p>

            {location ? <p className={styles.location}>{location}</p> : null}

            <div className={styles.actions}>
              {profile.githubUrl ? (
                <a
                  href={profile.githubUrl}
                  className={styles.primary}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver no GitHub
                  <ExternalHint />
                </a>
              ) : null}
              <AcaoProjetos className={styles.secondary} />
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main} id="conteudo">
        <ProjetosBloqueados quantidade={projectCount} />

        <ExperienceSection experiences={experiences} />

        <EducationSection education={education} />

        <SkillsSection skills={skills} />

        <ContactSection profile={profile} />

        <MensagemSection />
      </main>

      <footer className={styles.footer}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} {profile.fullName}
        </p>
        {/* Curta de propósito: quem estreitar a janela confirma na hora. */}
        <p className={styles.footerNote}>Este site se adapta a qualquer tamanho de tela.</p>
        <nav className={styles.footerNav} aria-label="Documentos legais">
          <Link href="/legal/termos-de-uso" className={styles.footerLink}>
            Termos de Uso
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/legal/politica-de-privacidade" className={styles.footerLink}>
            Política de Privacidade
          </Link>
        </nav>
      </footer>
    </div>
  );
}

/**
 * Aviso de que o link abre em outra aba.
 *
 * A seta ↗ dá o recado a quem enxerga, mas é aria-hidden e não chega a quem usa
 * leitor de tela — que descobriria a aba nova só depois de sair da página.
 */
function ExternalHint() {
  return <span className="sr-only"> (abre em nova aba)</span>;
}

/* ------------------------------------------------------------------ */
/* Projetos — atrás do login                                           */
/* ------------------------------------------------------------------ */

/**
 * Convite para entrar, no lugar da lista de projetos.
 *
 * Os projetos passaram a exigir sessão (decisão de 23/08/2026). O que fica
 * público é a existência deles e o convite — a lista, o estudo de caso e os
 * links vivem na área autenticada.
 *
 * A contagem aparece de propósito: "três projetos" dá a quem chega uma razão
 * concreta para criar a conta, enquanto uma porta fechada sem número nenhum
 * não diz se vale a pena.
 */
function ProjetosBloqueados({ quantidade }: { quantidade: number }) {
  return (
    <section className={styles.section} aria-labelledby="projetos-titulo" id="projetos">
      <Reveal>
        <h2 id="projetos-titulo" className={styles.sectionTitle}>
          Projetos
        </h2>
        <p className={styles.sectionSubtitle}>
          O problema, as decisões e o resultado — não apenas o link.
        </p>
      </Reveal>

      <Reveal>
        <div className={styles.gated}>
          <p className={styles.gatedTitle}>
            {quantidade === 1
              ? "Há 1 projeto detalhado aqui dentro."
              : `Há ${quantidade} projetos detalhados aqui dentro.`}
          </p>

          <TextoProjetos className={styles.gatedBody} />

          <div className={styles.gatedActions}>
            <AcaoProjetos className={styles.primary} classNameSecundaria={styles.secondary} />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
/* ------------------------------------------------------------------ */
/* Experiência                                                         */
/* ------------------------------------------------------------------ */

function ExperienceSection({ experiences }: { experiences: Experience[] }) {
  if (experiences.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="experiencia">
      <Reveal>
        <h2 id="experiencia" className={styles.sectionTitle}>
          Experiência
        </h2>
      </Reveal>

      <RevealList itemCount={experiences.length} className={styles.timeline}>
        {experiences.map((item) => (
          <RevealItem key={item.id}>
            <article className={styles.entry}>
              <div className={styles.entryHead}>
                <h3 className={styles.entryTitle}>{item.role}</h3>
                <p className={styles.entryOrg}>{item.company}</p>
              </div>
              <p className={styles.entryPeriod}>
                {formatPeriod(item.startedAt, item.endedAt)}
                {item.current ? <span className={styles.badge}>atual</span> : null}
              </p>
              <p className={styles.entryBody}>{item.description}</p>
            </article>
          </RevealItem>
        ))}
      </RevealList>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Formação                                                            */
/* ------------------------------------------------------------------ */

function EducationSection({ education }: { education: Education[] }) {
  if (education.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="formacao">
      <Reveal>
        <h2 id="formacao" className={styles.sectionTitle}>
          Formação
        </h2>
      </Reveal>

      <RevealList itemCount={education.length} className={styles.timeline}>
        {education.map((item) => (
          <RevealItem key={item.id}>
            <article className={styles.entry}>
              <div className={styles.entryHead}>
                <h3 className={styles.entryTitle}>{item.course}</h3>
                <p className={styles.entryOrg}>{item.institution}</p>
              </div>
              <p className={styles.entryPeriod}>
                {EDUCATION_LEVELS[item.level]}
                {item.completedAt ? ` · ${formatMonth(item.completedAt)}` : null}
                {item.status === "em_andamento" ? (
                  <span className={styles.badge}>em andamento</span>
                ) : null}
              </p>
            </article>
          </RevealItem>
        ))}
      </RevealList>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Habilidades                                                         */
/* ------------------------------------------------------------------ */

function SkillsSection({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="tecnologias">
      <Reveal>
        <h2 id="tecnologias" className={styles.sectionTitle}>
          Tecnologias
        </h2>
        <p className={styles.sectionSubtitle}>Com o que trabalho no dia a dia.</p>
      </Reveal>

      <RevealList itemCount={skills.length} className={styles.grid}>
        {skills.map((skill) => (
          <RevealItem key={skill.id}>
            <article className={styles.card}>
              {/*
                O ícone herda a cor do texto por currentColor, então acompanha o
                tema sem regra extra — e some para o leitor de tela, que já tem
                o nome da tecnologia logo abaixo.
              */}
              <span className={styles.cardIcon}>
                <SkillIcon name={skill.name} category={skill.category} />
              </span>
              <p className={styles.cardCategory}>{skill.category}</p>
              <h3 className={styles.cardTitle}>{skill.name}</h3>
              {skill.evidence ? <p className={styles.cardEvidence}>{skill.evidence}</p> : null}
            </article>
          </RevealItem>
        ))}
      </RevealList>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sugestões, dúvidas ou orçamentos                                    */
/* ------------------------------------------------------------------ */

/**
 * O formulário é um Client Component dentro de uma página de servidor: ele
 * precisa de estado e de envio, e o resto da home continua sendo HTML pronto.
 */
function MensagemSection() {
  return (
    <section className={styles.section} aria-labelledby="mensagem-titulo">
      <Reveal>
        <h2 id="mensagem-titulo" className={styles.sectionTitle}>
          Sugestões, dúvidas ou orçamentos
        </h2>
        <p className={styles.sectionSubtitle}>
          Tem uma pergunta sobre o meu trabalho, uma sugestão para este site, uma vaga em mente ou
          um projeto para orçar? Escreva aqui — respondo no e-mail que você informar.
        </p>
      </Reveal>

      <Reveal>
        <ContactForm />
      </Reveal>
    </section>
  );
}
/* ------------------------------------------------------------------ */
/* Contato                                                             */
/* ------------------------------------------------------------------ */

function ContactSection({ profile }: { profile: Profile }) {
  const links = [
    { label: "GitHub", href: profile.githubUrl },
    { label: "LinkedIn", href: profile.linkedinUrl },
    { label: "WhatsApp", href: profile.whatsappUrl },
    { label: "Site", href: profile.websiteUrl },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));

  if (links.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="contato">
      <Reveal>
        <h2 id="contato" className={styles.sectionTitle}>
          Onde me encontrar
        </h2>
      </Reveal>

      <RevealList itemCount={links.length} className={styles.links}>
        {links.map((link) => (
          <RevealItem key={link.label}>
            <a
              className={styles.socialLink}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.socialLabel}>{link.label}</span>
              <span className={styles.socialArrow} aria-hidden="true">
                ↗
              </span>
              <ExternalHint />
            </a>
          </RevealItem>
        ))}
      </RevealList>
    </section>
  );
}
