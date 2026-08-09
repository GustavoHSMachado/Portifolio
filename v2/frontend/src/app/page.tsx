import { Reveal, RevealItem, RevealList } from "@/components/motion/Reveal";
import { about, currentAge, profile, siteNotes, skills, socialLinks } from "@/lib/content";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Início",
  description: profile.intro,
};

export default function HomePage() {
  const age = currentAge();

  return (
    <div className={styles.page}>
      {/* ---------------- Capa ---------------- */}
      <header className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />

        <Reveal as="section">
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>{profile.role}</p>
            <h1 className={styles.title}>{profile.headline}</h1>
            <p className={styles.lead}>{profile.intro}</p>

            <div className={styles.actions}>
              <Link href="/entrar" className={styles.primary}>
                Entrar
              </Link>
              <Link href="/criar-conta" className={styles.secondary}>
                Criar conta
              </Link>
            </div>
          </div>
        </Reveal>
      </header>

      <main className={styles.main}>
        {/* ---------------- Sobre ---------------- */}
        <Reveal as="section">
          <section className={styles.section} aria-labelledby="sobre">
            <h2 id="sobre" className={styles.sectionTitle}>
              {about.title}
            </h2>
            <p className={styles.sectionSubtitle}>{profile.name}</p>

            <div className={styles.prose}>
              {about.paragraphs.map((paragraph, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: conteúdo estático e ordenado
                <p key={index}>{paragraph(age)}</p>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ---------------- Tecnologias ---------------- */}
        <section className={styles.section} aria-labelledby="tecnologias">
          <Reveal>
            <h2 id="tecnologias" className={styles.sectionTitle}>
              Tecnologias
            </h2>
            <p className={styles.sectionSubtitle}>Com o que trabalho no dia a dia.</p>
          </Reveal>

          <RevealList itemCount={skills.length} className={styles.grid}>
            {skills.map((skill) => (
              <RevealItem key={skill.name}>
                <article className={styles.card}>
                  <span className={styles.cardCategory}>{skill.category}</span>
                  <h3 className={styles.cardTitle}>{skill.name}</h3>
                  <span className={styles.cardLevel} data-level={skill.level}>
                    {skill.level}
                  </span>
                </article>
              </RevealItem>
            ))}
          </RevealList>
        </section>

        {/* ---------------- Notas sobre o site ---------------- */}
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

        {/* ---------------- Contato ---------------- */}
        <section className={styles.section} aria-labelledby="contato">
          <Reveal>
            <h2 id="contato" className={styles.sectionTitle}>
              Onde me encontrar
            </h2>
          </Reveal>

          <RevealList itemCount={socialLinks.length} className={styles.links}>
            {socialLinks.map((link) => (
              <RevealItem key={link.label}>
                <a
                  className={styles.socialLink}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.socialLabel}>{link.label}</span>
                  <span className={styles.socialHandle}>{link.handle}</span>
                  <span className={styles.socialArrow} aria-hidden="true">
                    ↗
                  </span>
                </a>
              </RevealItem>
            ))}
          </RevealList>
        </section>

        {/* ---------------- Lema ---------------- */}
        <Reveal>
          <blockquote className={styles.motto}>
            <p>{profile.motto}</p>
          </blockquote>
        </Reveal>
      </main>

      <footer className={styles.footer}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} {profile.name}
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
