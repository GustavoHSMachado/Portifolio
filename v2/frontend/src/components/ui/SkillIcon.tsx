import type { ReactElement } from "react";

/**
 * Ícone da habilidade, desenhado como SVG monocromático.
 *
 * Duas decisões que valem registro.
 *
 * Não são os logotipos das marcas. Um logo é propriedade de quem o criou, tem
 * regras de uso e cores fixas — colocar o roxo do PHP ao lado do laranja do
 * MySQL brigaria com a paleta do site e transformaria a seção numa colcha de
 * retalhos, ainda mais agora que o destaque é azul. Aqui os ícones dizem o que
 * a tecnologia *faz*: um cilindro para
 * banco, chaves para folha de estilo, um grafo para controle de versão.
 *
 * Todos usam `currentColor` e herdam a cor de quem os contém, então respondem
 * ao tema sem nenhuma regra extra — é isso que os faz respeitar as cores do
 * sistema em vez de impor as suas.
 *
 * O mapa é por nome, com reserva por categoria: uma habilidade nova cadastrada
 * pelo painel já nasce com o ícone da área dela, sem precisar de código.
 */

// ReactElement, e não JSX.Element: o React 19 deixou de declarar o namespace
// JSX global, e passou a expô-lo apenas como React.JSX.
type Desenho = (props: { className?: string }) => ReactElement;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

/** Código entre sinais de menor e maior — linguagens de programação. */
const Codigo: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <path d="m8 6-6 6 6 6" />
    <path d="m16 6 6 6-6 6" />
  </svg>
);

/** Cilindro — qualquer coisa que guarde dados. */
const Banco: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
    <path d="M4 5.5v13c0 1.66 3.58 3 8 3s8-1.34 8-3v-13" />
    <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
  </svg>
);

/** Marcação: uma tag aberta e fechada. */
const Marcacao: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M4 4h16v16H4z" />
    <path d="m9 10-2 2 2 2" />
    <path d="m15 10 2 2-2 2" />
  </svg>
);

/** Chaves — folha de estilo. */
const Chaves: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M9 4c-2 0-3 1-3 3v3c0 1-1 2-2 2 1 0 2 1 2 2v3c0 2 1 3 3 3" />
    <path d="M15 4c2 0 3 1 3 3v3c0 1 1 2 2 2-1 0-2 1-2 2v3c0 2-1 3-3 3" />
  </svg>
);

/** Duas setas em sentidos opostos — troca entre sistemas. */
const Integracao: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M4 8h13l-3-3" />
    <path d="M20 16H7l3 3" />
  </svg>
);

/** Grafo de ramificação — controle de versão. */
const Ramificacao: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="12" r="2.5" />
    <path d="M6 8.5v7" />
    <path d="M8.5 6h4a3 3 0 0 1 3 3v.5" />
  </svg>
);

/** Colunas de um quadro — gestão de tarefas. */
const Quadro: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M4 4h16v16H4z" />
    <path d="M10 4v16" />
    <path d="M16 4v16" />
  </svg>
);

/** Ciclo — processo que se repete em iterações. */
const Ciclo: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4h-4" />
  </svg>
);

/** Lupa sobre o erro — investigação. */
const Investigacao: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.5-4.5" />
    <path d="M8.5 10.5h4" />
  </svg>
);

/** Cartões movendo-se entre colunas — quadro de trabalho em fluxo. */
const Fluxo: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M4 5h5v6H4z" />
    <path d="M15 5h5v10h-5z" />
    <path d="M4 15h5v4H4z" />
    <path d="M11 8h2" />
  </svg>
);

/**
 * Prompt de terminal com uma faísca — assistência de IA na linha de comando.
 * O chevron é o vocabulário universal de terminal; a faísca é o que o distingue
 * de um shell comum.
 */
const Assistente: Desenho = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M3 5h18v14H3z" />
    <path d="m7 10 2 2-2 2" />
    <path d="M16.5 9.5v3" />
    <path d="M15 11h3" />
  </svg>
);

const PorNome: Record<string, Desenho> = {
  php: Codigo,
  java: Codigo,
  "sql / mysql": Banco,
  "banco de dados relacional": Banco,
  html: Marcacao,
  css: Chaves,
  "apis rest": Integracao,
  git: Ramificacao,
  jira: Quadro,
  scrum: Ciclo,
  kanban: Fluxo,
  "claude code": Assistente,
  "debugging e análise de erros": Investigacao,
};

const PorCategoria: Record<string, Desenho> = {
  linguagens: Codigo,
  dados: Banco,
  "front-end": Marcacao,
  arquitetura: Integracao,
  ferramentas: Ramificacao,
  processo: Ciclo,
};

export function SkillIcon({
  name,
  category,
  className,
}: {
  name: string;
  category: string;
  className?: string;
}) {
  const Desenhar =
    PorNome[name.trim().toLowerCase()] ?? PorCategoria[category.trim().toLowerCase()] ?? Codigo;

  return <Desenhar className={className} />;
}
