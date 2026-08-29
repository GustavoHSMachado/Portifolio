import { describe, expect, it } from "vitest";
import {
  contraste,
  contrasteDoDestaque,
  contrasteDoDestaqueClaro,
  corValida,
  nivelWcag,
  paletaDeDestaque,
  paraFundoClaro,
} from "./cores";

describe("corValida", () => {
  it("aceita #rrggbb em qualquer caixa", () => {
    expect(corValida("#5aa9ff")).toBe(true);
    expect(corValida("#5AA9FF")).toBe(true);
  });

  it("recusa o que não for exatamente #rrggbb", () => {
    expect(corValida("#abc")).toBe(false);
    expect(corValida("5aa9ff")).toBe(false);
    expect(corValida("rgb(90, 169, 255)")).toBe(false);
    expect(corValida("red")).toBe(false);
    expect(corValida("#5aa9ff ")).toBe(false);
  });

  it("recusa tentativa de injeção de CSS", () => {
    // A cor entra numa folha de estilo: fechar a declaração e abrir outra regra
    // permitiria reposicionar elementos sobre a tela.
    expect(corValida("red;} body{display:none} a{color:red")).toBe(false);
    expect(corValida("url(javascript:alert(1))")).toBe(false);
    expect(corValida("#5aa9ff;}*{color:red")).toBe(false);
  });
});

describe("contraste", () => {
  it("dá 21 entre preto e branco, o máximo possível", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("dá 1 para a cor contra ela mesma", () => {
    expect(contraste("#5aa9ff", "#5aa9ff")).toBeCloseTo(1, 5);
  });

  it("independe da ordem dos argumentos", () => {
    expect(contraste("#5aa9ff", "#0b0b0f")).toBeCloseTo(contraste("#0b0b0f", "#5aa9ff"), 5);
  });
});

describe("contrasteDoDestaque", () => {
  it("aprova o azul do tema com folga", () => {
    // O tom foi escolhido por medição: 8:1 sobre o fundo base.
    expect(contrasteDoDestaque("#5aa9ff")).toBeGreaterThan(7);
  });

  it("reprova um tom escuro sobre o fundo quase preto", () => {
    expect(contrasteDoDestaque("#1a3d6b")).toBeLessThan(4.5);
  });

  it("devolve o pior dos dois fundos, e não a média", () => {
    // A superfície elevada é mais clara, então o contraste ali é sempre menor.
    const cor = "#5aa9ff";
    expect(contrasteDoDestaque(cor)).toBeLessThanOrEqual(contraste(cor, "#0b0b0f"));
  });
});

describe("nivelWcag", () => {
  it("classifica pelos cortes da especificação", () => {
    expect(nivelWcag(7)).toBe("AAA");
    expect(nivelWcag(4.5)).toBe("AA");
    expect(nivelWcag(4.49)).toBe("reprovado");
  });
});

describe("paletaDeDestaque", () => {
  it("mantém a cor escolhida como accent", () => {
    expect(paletaDeDestaque("#5AA9FF").accent).toBe("#5aa9ff");
  });

  it("clareia no hover e escurece no active", () => {
    const paleta = paletaDeDestaque("#5aa9ff");

    expect(contraste(paleta.accentHover, "#ffffff")).toBeLessThan(
      contraste(paleta.accent, "#ffffff"),
    );
    expect(contraste(paleta.accentActive, "#000000")).toBeLessThan(
      contraste(paleta.accent, "#000000"),
    );
  });

  it("deriva os fundos translúcidos da mesma cor", () => {
    const paleta = paletaDeDestaque("#5aa9ff");

    expect(paleta.accentSubtle).toBe("rgba(90, 169, 255, 0.12)");
    expect(paleta.accentRing).toBe("rgba(90, 169, 255, 0.4)");
  });

  it("não estoura os limites do canal com cores extremas", () => {
    // Branco não tem como clarear mais; preto não tem como escurecer.
    expect(paletaDeDestaque("#ffffff").accentHover).toBe("#ffffff");
    expect(paletaDeDestaque("#000000").accentActive).toBe("#000000");
  });
});

describe("paraFundoClaro", () => {
  it("escurece o azul do tema até ele servir sobre branco", () => {
    // O tom claro foi escolhido para fundo quase preto e reprova sobre branco.
    expect(contrasteDoDestaqueClaro("#5aa9ff")).toBeLessThan(4.5);
    expect(contrasteDoDestaqueClaro(paraFundoClaro("#5aa9ff"))).toBeGreaterThanOrEqual(4.5);
  });

  it("deixa em paz a cor que já passa", () => {
    // Um azul escuro já serve sobre branco: mexer nele seria mudar a escolha
    // de quem editou sem necessidade.
    const jaEscura = "#1a3d6b";
    expect(contrasteDoDestaqueClaro(jaEscura)).toBeGreaterThanOrEqual(4.5);
    expect(paraFundoClaro(jaEscura)).toBe(jaEscura);
  });

  it("muda o mínimo necessário", () => {
    // Para no primeiro passo que alcança o AA, então o resultado não deve estar
    // muito além do alvo — se estivesse, a cor teria deixado de ser reconhecível.
    expect(contrasteDoDestaqueClaro(paraFundoClaro("#5aa9ff"))).toBeLessThan(9);
  });

  it("resolve o caso extremo do branco", () => {
    // Branco sobre branco é o pior ponto de partida possível.
    expect(contrasteDoDestaqueClaro(paraFundoClaro("#ffffff"))).toBeGreaterThanOrEqual(4.5);
  });

  it("devolve sempre um #rrggbb válido", () => {
    for (const cor of ["#5aa9ff", "#ffffff", "#22c55e", "#f5b942", "#000000"]) {
      expect(corValida(paraFundoClaro(cor))).toBe(true);
    }
  });
});

describe("paraFundoClaro preserva a identidade da cor", () => {
  function hsl(c: string) {
    const n = (i: number) => Number.parseInt(c.slice(i, i + 2), 16) / 255;
    const [r, g, b] = [n(1), n(3), n(5)];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;
    if (d === 0) return { h: 0, s: 0, l };
    let h: number;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: d / (1 - Math.abs(2 * l - 1)), l };
  }

  it("mantém o matiz — azul continua azul", () => {
    const antes = hsl("#5aa9ff");
    const depois = hsl(paraFundoClaro("#5aa9ff"));

    expect(Math.abs(antes.h - depois.h)).toBeLessThan(2);
  });

  it("mantém a saturação, e não devolve um cinza-azulado", () => {
    // A primeira versão multiplicava os canais RGB e derrubava a saturação de
    // 100% para 48%. É o defeito que este caso existe para não deixar voltar.
    const antes = hsl("#5aa9ff");
    const depois = hsl(paraFundoClaro("#5aa9ff"));

    expect(depois.s).toBeGreaterThan(antes.s - 0.05);
  });

  it("escurece, que é o ponto do ajuste", () => {
    expect(hsl(paraFundoClaro("#5aa9ff")).l).toBeLessThan(hsl("#5aa9ff").l);
  });
});
