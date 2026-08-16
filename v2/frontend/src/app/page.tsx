import { Reveal, RevealItem, RevealList } from "@/components/motion/Reveal";
import { siteNotes } from "@/lib/content";
import {
  EDUCATION_LEVELS,
  type Education,
  type Experience,
  type Profile,
  type Project,
  type Skill,
  fetchContent,
  formatMonth,
  formatPeriod,
} from "@/lib/portfolio";
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
  const { profile } = await fetchContent();

  if (!profile) {
    return { title: "Portfólio" };
  }

  const description = profile.summary.slice(0, 155);

  return {
    title: `${profile.fullName} — ${profile.role}`,
    description,
    openGraph: {
      title: `${profile.fullName} — ${profile.role}`,
      description,
      type: "profile",
    },
  };
}

export default async function HomePage() {
  const { profile, education, experiences, skills, projects } = await fetchContent();

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

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div>
            <p className={styles.eyebrow}>{profile.role}</p>
            <h1 className={styles.title}>{profile.headline}</h1>
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
                </a>
              ) : null}
              <a href="#projetos" className={styles.secondary}>
                Ver projetos
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main} id="conteudo">
        <ProjectsSection projects={projects} />

        <ExperienceSection experiences={experiences} />

        <EducationSection education={education} />

        <SkillsSection skills={skills} />

        <VideoSection profile={profile} />

        {/* ---------------- Sobre este site ---------------- */}
        <section className={styles.section} aria-labelledby="sobre-o-site">
          <Reveal>
            <h2 id="sobre-o-site" className={styles.sectionTitle}>
              Sobre este site
            </h2>
            <p className={styles.sectionSubtitle}>
              O que é autoral, o que não é, e por que escolhi assim.
            </p>
          </Reveal>

          <RevealList itemCount={siteNotes.length} className={styles.notes}>
            {siteNotes.map((note) => (
              <RevealItem key={note.title}>
                <article className={styles.note}>
                  <h3 className={styles.noteTitle}>{note.title}</h3>
                  <p className={styles.noteBody}>{note.body}</p>
                </article>
              </RevealItem>
            ))}
          </RevealList>
        </section>

        <ContactSection profile={profile} />
      </main>

      <footer className={styles.footer}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} {profile.fullName}
        </p>
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

/* ------------------------------------------------------------------ */
/* Projetos                                                            */
/* ------------------------------------------------------------------ */

function ProjectsSection({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="projetos" id="projetos">
      <Reveal>
        <h2 id="projetos" className={styles.sectionTitle}>
          Projetos
        </h2>
        <p className={styles.sectionSubtitle}>
          O problema, as decisões e o resultado — não apenas o link.
        </p>
      </Reveal>

      <RevealList itemCount={projects.length} className={styles.projects}>
        {projects.map((project) => (
          <RevealItem key={project.id}>
            <article className={styles.project}>
              <header className={styles.projectHead}>
                <h3 className={styles.projectTitle}>{project.title}</h3>
                <p className={styles.projectSummary}>{project.summary}</p>
              </header>

              {project.stack.length > 0 ? (
                <ul className={styles.stack} aria-label="Tecnologias">
                  {project.stack.map((tech) => (
                    <li key={tech} className={styles.tech}>
                      {tech}
                    </li>
                  ))}
                </ul>
              ) : null}

              <dl className={styles.caseStudy}>
                {project.problem ? (
                  <div>
                    <dt>Problema</dt>
                    <dd>{project.problem}</dd>
                  </div>
                ) : null}
                {project.decisions ? (
                  <div>
                    <dt>Decisões</dt>
                    <dd>{project.decisions}</dd>
                  </div>
                ) : null}
                {project.result ? (
                  <div>
                    <dt>Resultado</dt>
                    <dd>{project.result}</dd>
                  </div>
                ) : null}
              </dl>

              <div className={styles.projectLinks}>
                {project.repositoryUrl ? (
                  <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">
                    Código
                  </a>
                ) : null}
                {project.demoUrl ? (
                  <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                    Demonstração
                  </a>
                ) : null}
              </div>
            </article>
          </RevealItem>
        ))}
      </RevealList>
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
/* Vídeo                                                               */
/* ------------------------------------------------------------------ */

function VideoSection({ profile }: { profile: Profile }) {
  if (!profile.introVideoId) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="apresentacao">
      <Reveal>
        <h2 id="apresentacao" className={styles.sectionTitle}>
          Apresentação
        </h2>
        {profile.introVideoCaption ? (
          <p className={styles.sectionSubtitle}>{profile.introVideoCaption}</p>
        ) : null}

        {/*
          Link em vez de iframe: o embed do YouTube carrega centenas de
          kilobytes de script e rastreadores em toda visita, mesmo de quem
          nunca aperta play. O custo cairia sobre o orçamento de performance
          da página inteira, por um vídeo que poucos vão assistir.
        */}
        <a
          className={styles.videoLink}
          href={`https://www.youtube.com/watch?v=${profile.introVideoId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Assistir no YouTube
          <span aria-hidden="true"> ↗</span>
        </a>
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
            </a>
          </RevealItem>
        ))}
      </RevealList>
    </section>
  );
}
