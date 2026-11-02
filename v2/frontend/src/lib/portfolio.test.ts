import { describe, expect, it } from "vitest";
import { AJUSTES_PADRAO, EDUCATION_LEVELS, formatMonth, formatPeriod } from "./portfolio";

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
