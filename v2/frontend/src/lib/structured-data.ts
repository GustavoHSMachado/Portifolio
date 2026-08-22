import type { Education, Experience, Profile, Project, Skill } from "@/lib/portfolio";
import { SITE_URL } from "@/lib/site";

/**
 * Dados estruturados da home (schema.org).
 *
 * Quem lê um portfólio como texto entende sozinho que "Analista de Sistemas" é
 * o cargo e "Sistemas de Informação" é a formação. Um buscador não — ele vê
 * parágrafos. O JSON-LD diz isso de forma explícita, e é o que permite o site
 * aparecer como pessoa, com cargo e vínculos, em vez de só um título azul.
 *
 * Regra que a marcação precisa respeitar: só descreve o que está visível na
 * página. Marcar o que não se vê é o que os buscadores classificam como spam.
 */
export function buildPersonJsonLd({
  profile,
  education,
  experiences,
  skills,
  projects,
}: {
  profile: Profile;
  education: Education[];
  experiences: Experience[];
  skills: Skill[];
  projects: Project[];
}) {
  const sameAs = [profile.githubUrl, profile.linkedinUrl, profile.websiteUrl].filter(
    (url): url is string => Boolean(url),
  );

  const currentJob = experiences.find((item) => item.current);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.fullName,
    alternateName: profile.shortName,
    jobTitle: profile.role,
    description: profile.summary,
    url: SITE_URL,
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(profile.city
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: profile.city,
            ...(profile.state ? { addressRegion: profile.state } : {}),
            addressCountry: "BR",
          },
        }
      : {}),
    ...(currentJob ? { worksFor: { "@type": "Organization", name: currentJob.company } } : {}),
    ...(education.length > 0
      ? {
          alumniOf: education.map((item) => ({
            "@type": "EducationalOrganization",
            name: item.institution,
          })),
        }
      : {}),
    ...(skills.length > 0 ? { knowsAbout: skills.map((skill) => skill.name) } : {}),
    ...(projects.length > 0
      ? {
          subjectOf: projects.map((project) => ({
            "@type": "CreativeWork",
            name: project.title,
            abstract: project.summary,
            ...(project.repositoryUrl ? { url: project.repositoryUrl } : {}),
          })),
        }
      : {}),
  };
}

/**
 * Serializa o JSON-LD para dentro de um `<script>`.
 *
 * O conteúdo é editável pelo painel, e um `</script>` digitado em qualquer campo
 * fecharia a tag no meio do JSON — o resto do texto passaria a ser interpretado
 * como HTML. Escapar o `<` fecha essa porta sem alterar o valor: `\u003c` é lido
 * como "<" pelo parser de JSON.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\u003c");
}
