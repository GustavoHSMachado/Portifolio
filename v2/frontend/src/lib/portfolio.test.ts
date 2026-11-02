import { describe, expect, it } from "vitest";
import {
  AJUSTES_PADRAO,
  EDUCATION_LEVELS,
  FOTOS_POR_PROJETO,
  FOTO_TAMANHO_MAXIMO,
  formatMonth,
  formatPeriod,
  recusarFotos,
} from "./portfolio";

/**
 * As conversões que vão direto para a tela.
 *
 * Formatação de data é o tipo de função que parece trivial e erra em silêncio:
 * um mês fora do intervalo não lança exceção, só imprime "undefined de 2025" no
 * meio do currículo. Os testes aqui fixam o formato visível e o que acontece
 * quando o dado está faltando — os dois casos que o visitante enxerga.
 */
describe("formatMonth", () => {
  it("escreve o mês por extenso", () => {
    expect(formatMonth("2025-03")).toBe("março de 2025");
    expect(formatMonth("2026-12")).toBe("dezembro de 2026");
    expect(formatMonth("2024-01")).toBe("janeiro de 2024");
  });

  /** Campo opcional no banco: a tela recebe null e não pode imprimir "null". */
  it("devolve vazio quando não há data", () => {
    expect(formatMonth(null)).toBe("");
  });

  /**
   * Mês inválido devolve o valor original em vez de "undefined de 2025".
   *
   * O índice 12 não existe no array de meses, e sem esta guarda o currículo
   * exibiria a palavra "undefined" — um defeito visível para quem lê e
   * invisível para quem programa.
   */
  it("devolve o valor original quando o mês não existe", () => {
    expect(formatMonth("2025-13")).toBe("2025-13");
    expect(formatMonth("sem-formato")).toBe("sem-formato");
  });
});

describe("formatPeriod", () => {
  it("usa o intervalo quando há data de saída", () => {
    expect(formatPeriod("2024-02", "2025-08")).toBe("fevereiro de 2024 — agosto de 2025");
  });

  /** Sem data de saída, é o emprego atual — e precisa dizer isso. */
  it('escreve "atual" quando não há data de saída', () => {
    expect(formatPeriod("2024-02", null)).toBe("fevereiro de 2024 — atual");
  });
});

describe("AJUSTES_PADRAO", () => {
  /**
   * Estes padrões duplicam os do servidor de propósito (ver o comentário na
   * fonte): sem eles, a home renderizada com a API fora do ar ficaria com as
   * seções sem título nenhum. O teste trava o contrato — nenhuma chave pode
   * chegar vazia sem alguém decidir isso.
   */
  it("traz um título para cada seção da home", () => {
    for (const chave of [
      "projetos_titulo",
      "experiencia_titulo",
      "formacao_titulo",
      "tecnologias_titulo",
      "mensagem_titulo",
      "contato_titulo",
    ] as const) {
      expect(AJUSTES_PADRAO[chave]).not.toBe("");
    }
  });

  /** A cor de destaque termina dentro de uma folha de estilo: só #rrggbb. */
  it("tem a cor de destaque em hexadecimal de seis dígitos", () => {
    expect(AJUSTES_PADRAO.cor_destaque).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("EDUCATION_LEVELS", () => {
  it("rotula todos os níveis que a API aceita", () => {
    expect(Object.keys(EDUCATION_LEVELS)).toEqual([
      "tecnico",
      "graduacao",
      "pos_graduacao",
      "mestrado",
      "doutorado",
      "curso",
    ]);
  });
});

/**
 * A recusa do envio de fotos.
 *
 * O servidor é quem decide de verdade, mas esta função é o que impede a
 * pessoa de esperar uma subida de 2 MB para receber um "não". Ela recusa o
 * lote inteiro de propósito: aceitar os válidos e descartar os ruins em
 * silêncio deixaria alguém achando que mandou cinco quando mandou três.
 */
describe("recusarFotos", () => {
  function arquivo(nome: string, tipo: string, tamanho: number): File {
    const falso = new File(["x"], nome, { type: tipo });

    // File() define size pelo conteúdo, e escrever 2 MB em memória só para
    // testar o limite seria desperdício.
    Object.defineProperty(falso, "size", { value: tamanho });

    return falso;
  }

  const bom = () => arquivo("tela.png", "image/png", 1024);

  it("aceita uma seleção dentro dos limites", () => {
    expect(recusarFotos([bom(), bom()], 8)).toBeNull();
  });

  it("aceita exatamente o número de vagas", () => {
    expect(recusarFotos([bom(), bom(), bom()], 3)).toBeNull();
  });

  it("recusa quando não há vaga nenhuma, dizendo o limite", () => {
    expect(recusarFotos([bom()], 0)).toContain(String(FOTOS_POR_PROJETO));
  });

  it("recusa o excesso dizendo quantas cabem", () => {
    const queixa = recusarFotos([bom(), bom(), bom()], 2);

    expect(queixa).toContain("escolheu 3");
    expect(queixa).toContain("cabem 2");
  });

  /** O nome no erro é o que permite achar o arquivo errado entre vários. */
  it("nomeia o arquivo de formato recusado", () => {
    const queixa = recusarFotos([bom(), arquivo("curriculo.pdf", "application/pdf", 1024)], 8);

    expect(queixa).toContain("curriculo.pdf");
  });

  it("recusa SVG, que é o formato que carrega script", () => {
    expect(recusarFotos([arquivo("logo.svg", "image/svg+xml", 1024)], 8)).toContain("logo.svg");
  });

  it("nomeia o arquivo grande demais", () => {
    const queixa = recusarFotos([arquivo("foto.jpg", "image/jpeg", FOTO_TAMANHO_MAXIMO + 1)], 8);

    expect(queixa).toContain("foto.jpg");
    expect(queixa).toContain("2 MB");
  });

  it("aceita o arquivo no limite exato", () => {
    expect(recusarFotos([arquivo("foto.jpg", "image/jpeg", FOTO_TAMANHO_MAXIMO)], 8)).toBeNull();
  });

  it("não reclama de seleção vazia — quem trata isso é a tela", () => {
    expect(recusarFotos([], 8)).toBeNull();
  });
});
