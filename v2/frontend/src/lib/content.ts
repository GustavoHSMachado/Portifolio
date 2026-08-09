/**
 * Conteúdo do portfólio.
 *
 * Migrado da v1 (pageUser.php / index.php), que era o texto do Gustavo embutido
 * no HTML. Trazido para cá com revisão de pontuação e concordância — o conteúdo
 * é o mesmo, a redação foi limpa.
 *
 * Mora em um módulo separado para que trocar um texto não signifique mexer em
 * JSX, e para que a migração para um CMS, se um dia acontecer, seja localizada.
 */

export const profile = {
  name: "Gustavo Henrique Santos Machado",
  shortName: "Gustavo Henrique",
  birthDate: "1994-07-17",
  role: "Profissional de T.I.",
  headline: "Seja bem-vindo ao meu portfólio",
  intro:
    "Olá, sou Gustavo, um profissional de T.I. apaixonado por tecnologia, desafios e inovação. " +
    "Este espaço digital representa minha paixão pela área e o desejo de enfrentar novos " +
    "horizontes tecnológicos. Obrigado por visitar!",
  motto: "Que hoje seja melhor que ontem. Nem sempre vou conseguir, mas todos os dias vou tentar.",
} as const;

/** Idade calculada em tempo de render — a v1 tinha a mesma função em PHP. */
export function currentAge(birthDate: string = profile.birthDate): number {
  const birth = new Date(birthDate);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export const about = {
  title: "Sobre mim",
  paragraphs: [
    (age: number) =>
      `Tenho ${age} anos e curso Sistemas de Informação, com foco em desenvolvimento. Trabalho com Java e PHP, além de CSS e HTML, mas é no back-end que me sinto em casa.`,
    () =>
      "Sou católico e gosto de tocar violão e gaita — o que não quer dizer que eu toque bem. " +
      "Gosto de nadar e de jogar, mesmo que meu físico não demonstre. " +
      "Me considero coerente, disciplinado, proativo e criativo.",
  ],
} as const;

export const skills = [
  { name: "PHP", level: "Avançado", category: "Back-end" },
  { name: "Java", level: "Intermediário", category: "Back-end" },
  { name: "MySQL", level: "Intermediário", category: "Dados" },
  { name: "HTML5", level: "Intermediário", category: "Front-end" },
  { name: "CSS3", level: "Intermediário", category: "Front-end" },
  { name: "JavaScript", level: "Básico", category: "Front-end" },
] as const;

/**
 * Notas sobre o próprio site, herdadas da v1.
 * O Gustavo creditava o template e explicava suas escolhas — mantive porque
 * transparência sobre o que é e o que não é autoral é um bom sinal em portfólio.
 */
export const siteNotes = [
  {
    title: "Sobre o design",
    body:
      "O HTML5 e o CSS3 da primeira versão deste site não eram meus: vieram de um template " +
      "gratuito, revisado por um amigo formado em Marketing e Design Gráfico. Esta segunda " +
      "versão foi construída do zero, preservando apenas a tipografia e a cor de destaque.",
  },
  {
    title: "Sobre a escolha do template",
    body:
      "Optei por algo fácil de usar para garantir uma experiência positiva. Navegação simples, " +
      "elementos dispostos de forma intuitiva e informação clara são o que fazem a diferença.",
  },
  {
    title: "Sobre responsividade",
    body:
      "Escolhi um layout totalmente responsivo para que você possa explorar o site e ter uma " +
      "boa experiência em qualquer dispositivo.",
  },
] as const;

export const socialLinks = [
  { label: "GitHub", href: "https://github.com/gustavohsmachado", handle: "@gustavohsmachado" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/gustavo-henrique-santos-machado-22379440/",
    handle: "Gustavo Henrique",
  },
  { label: "Instagram", href: "http://www.instagram.com/gustavoxuxus", handle: "@gustavoxuxus" },
  { label: "Spotify", href: "https://open.spotify.com/user/gustavoxuxu", handle: "gustavoxuxu" },
  { label: "WhatsApp", href: "https://wa.me/5531986585208", handle: "Mandar mensagem" },
] as const;
