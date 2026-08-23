/**
 * Cor de destaque: derivação da paleta e medição de contraste.
 *
 * O painel deixa escolher uma cor só, mas o design system usa cinco variáveis
 * a partir dela — hover, active, o fundo sutil e o anel de foco. Pedir as cinco
 * transferiria para quem edita um trabalho que é aritmética, e com boa chance
 * de sair incoerente. Aqui elas saem da escolhida, mantendo a relação entre
 * elas que o tema já tinha.
 *
 * O contraste é medido, e não estimado no olho. O valor volta para a interface
 * mostrar antes de salvar: cor bonita que reprova em legibilidade é o erro mais
 * fácil de cometer numa tela dessas, e o mais difícil de perceber depois.
 */

/** Fundo base do tema (--surface-base). Referência para medir o contraste. */
const FUNDO_BASE = "#0b0b0f";

/** Fundo das superfícies elevadas (--surface-raised), onde o azul também aparece. */
const FUNDO_ELEVADO = "#14141a";

export interface PaletaDeDestaque {
  accent: string;
  accentHover: string;
  accentActive: string;
  accentSubtle: string;
  accentRing: string;
}

/** Aceita apenas #rrggbb — a mesma regra do servidor, ver SiteSettings::corValida. */
export function corValida(valor: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(valor);
}

export function paletaDeDestaque(cor: string): PaletaDeDestaque {
  const { r, g, b } = paraRgb(cor);

  return {
    accent: cor.toLowerCase(),
    accentHover: clarear(r, g, b, 0.16),
    accentActive: escurecer(r, g, b, 0.14),
    accentSubtle: `rgba(${r}, ${g}, ${b}, 0.12)`,
    accentRing: `rgba(${r}, ${g}, ${b}, 0.4)`,
  };
}

/**
 * Contraste da cor contra os dois fundos em que ela aparece como texto.
 *
 * Devolve o pior dos dois, que é o que decide: passar em um e falhar no outro
 * significa que existe texto ilegível em algum lugar da página.
 */
export function contrasteDoDestaque(cor: string): number {
  return Math.min(contraste(cor, FUNDO_BASE), contraste(cor, FUNDO_ELEVADO));
}

/**
 * Razão de contraste da WCAG entre duas cores.
 *
 * A fórmula é a da especificação: luminância relativa de cada cor, mais claro
 * sobre mais escuro, com o 0,05 que evita divisão por zero no preto absoluto.
 */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const claro = Math.max(la, lb);
  const escuro = Math.min(la, lb);

  return (claro + 0.05) / (escuro + 0.05);
}

/** O nível da WCAG que a razão alcança para texto normal. */
export function nivelWcag(razao: number): "AAA" | "AA" | "reprovado" {
  if (razao >= 7) return "AAA";
  if (razao >= 4.5) return "AA";

  return "reprovado";
}

function paraRgb(cor: string): { r: number; g: number; b: number } {
  const limpo = cor.replace("#", "");

  return {
    r: Number.parseInt(limpo.slice(0, 2), 16),
    g: Number.parseInt(limpo.slice(2, 4), 16),
    b: Number.parseInt(limpo.slice(4, 6), 16),
  };
}

function paraHex(r: number, g: number, b: number): string {
  const parte = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");

  return `#${parte(r)}${parte(g)}${parte(b)}`;
}

function clarear(r: number, g: number, b: number, fator: number): string {
  return paraHex(r + (255 - r) * fator, g + (255 - g) * fator, b + (255 - b) * fator);
}

function escurecer(r: number, g: number, b: number, fator: number): string {
  return paraHex(r * (1 - fator), g * (1 - fator), b * (1 - fator));
}

/**
 * Luminância relativa, conforme a WCAG.
 *
 * O canal é linearizado antes de entrar na soma: sRGB é armazenado com correção
 * de gama, e somar os valores crus daria um resultado que não corresponde ao
 * brilho percebido.
 */
function luminancia(cor: string): number {
  const { r, g, b } = paraRgb(cor);

  const canal = (valor: number): number => {
    const v = valor / 255;

    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}
