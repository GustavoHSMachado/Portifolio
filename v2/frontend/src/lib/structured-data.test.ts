import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./structured-data";

/**
 * O JSON-LD é escrito num <script> inline com conteúdo que vem do painel.
 *
 * Estes testes existem por causa de um defeito real: a função usava "\u003c"
 * com uma barra só, que em JavaScript É o caractere "<" — o replace trocava
 * "<" por "<" e não protegia nada. O comentário dizia que protegia; só um
 * teste que executa o código revela a diferença.
 */
describe("serializeJsonLd", () => {
  it("não deixa passar uma tag de fechamento de script", () => {
    const saida = serializeJsonLd({ nome: "Kanban</script><script>alert(1)</script>" });

    expect(saida).not.toContain("</script");
    expect(saida).not.toContain("<script");
  });

  it("escapa todo sinal de menor, não só o do fechamento", () => {
    const saida = serializeJsonLd({ texto: "a < b e c < d" });

    expect(saida).not.toContain("<");
    expect(saida).toContain("\\u003c");
  });

  it("preserva o valor: o JSON continua sendo lido com o texto original", () => {
    const original = { texto: "1 < 2 </script>" };
    const saida = serializeJsonLd(original);

    // O parser de JSON entende \u003c como "<" e devolve o texto intacto.
    expect(JSON.parse(saida)).toEqual(original);
  });

  it("não altera conteúdo sem sinal de menor", () => {
    const saida = serializeJsonLd({ nome: "Kanban", nota: "sem nada demais" });

    expect(JSON.parse(saida)).toEqual({ nome: "Kanban", nota: "sem nada demais" });
  });
});
