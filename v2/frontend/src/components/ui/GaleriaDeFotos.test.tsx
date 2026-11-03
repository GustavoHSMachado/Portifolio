import type { ProjectImage } from "@/lib/portfolio";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GaleriaDeFotos } from "./GaleriaDeFotos";

/**
 * A galeria é o único lugar onde as telas de um projeto aparecem em tamanho
 * grande — nos cartões elas são miniaturas de 132px. O que se testa aqui é a
 * navegação: abrir na foto certa, dar a volta nas pontas e responder ao
 * teclado, que é como alguém sem mouse percorre a galeria.
 */
const FOTOS: ProjectImage[] = [
  {
    id: 1,
    path: "uploads/projetos/a.png",
    url: "/a.png",
    alt: "Tela da vitrine",
    position: 0,
    isCover: false,
  },
  {
    id: 2,
    path: "uploads/projetos/b.png",
    url: "/b.png",
    alt: "Tela do painel",
    position: 1,
    isCover: false,
  },
  {
    id: 3,
    path: "uploads/projetos/c.png",
    url: "/c.png",
    alt: "Tela do envio",
    position: 2,
    isCover: false,
  },
];

function abrir(inicial: number | null = 0, fotos: ProjectImage[] = FOTOS) {
  const onClose = vi.fn();

  render(
    <GaleriaDeFotos fotos={fotos} projeto="Portfólio v2" inicial={inicial} onClose={onClose} />,
  );

  return { onClose };
}

/** A foto grande é a única sem `alt` vazio: as miniaturas são decorativas. */
function fotoVisivel(): string {
  const imagens = screen.getAllByRole("img");

  return imagens[0]?.getAttribute("alt") ?? "";
}

describe("GaleriaDeFotos", () => {
  it("fica fechada enquanto o índice inicial é nulo", () => {
    abrir(null);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("não renderiza nada quando o projeto não tem fotos", () => {
    abrir(0, []);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("abre na foto que foi clicada, e não na primeira", () => {
    abrir(2);

    expect(fotoVisivel()).toBe("Tela do envio");
    expect(screen.getByText("3 de 3")).toBeTruthy();
  });

  it("anuncia o projeto no título do diálogo", () => {
    abrir();

    expect(screen.getByRole("dialog").textContent).toContain("Portfólio v2");
  });

  it("avança com a seta da tela", async () => {
    const usuario = userEvent.setup();
    abrir();

    await usuario.click(screen.getByRole("button", { name: "Próxima foto" }));

    expect(fotoVisivel()).toBe("Tela do painel");
  });

  it("volta com a seta da tela", async () => {
    const usuario = userEvent.setup();
    abrir(1);

    await usuario.click(screen.getByRole("button", { name: "Foto anterior" }));

    expect(fotoVisivel()).toBe("Tela da vitrine");
  });

  /** Chegar na última e continuar não pode deixar a pessoa num beco. */
  it("dá a volta da última para a primeira", async () => {
    const usuario = userEvent.setup();
    abrir(2);

    await usuario.click(screen.getByRole("button", { name: "Próxima foto" }));

    expect(fotoVisivel()).toBe("Tela da vitrine");
  });

  it("dá a volta da primeira para a última", async () => {
    const usuario = userEvent.setup();
    abrir();

    await usuario.click(screen.getByRole("button", { name: "Foto anterior" }));

    expect(fotoVisivel()).toBe("Tela do envio");
  });

  it("anda com as setas do teclado", async () => {
    const usuario = userEvent.setup();
    abrir();

    await usuario.keyboard("{ArrowRight}");
    expect(fotoVisivel()).toBe("Tela do painel");

    await usuario.keyboard("{ArrowLeft}");
    expect(fotoVisivel()).toBe("Tela da vitrine");
  });

  it("pula direto pela miniatura", async () => {
    const usuario = userEvent.setup();
    abrir();

    await usuario.click(screen.getByRole("button", { name: "Ver Tela do envio" }));

    expect(fotoVisivel()).toBe("Tela do envio");
  });

  /** Uma foto só não precisa de setas nem de contador. */
  it("esconde a navegação quando há uma foto apenas", () => {
    abrir(0, [FOTOS[0] as ProjectImage]);

    expect(screen.queryByRole("button", { name: "Próxima foto" })).toBeNull();
    expect(screen.queryByText("1 de 1")).toBeNull();
  });
});

/**
 * Ampliar é o que torna a galeria útil para tela de sistema: numa captura de
 * painel, o texto some quando a imagem cabe inteira na janela.
 */
describe("GaleriaDeFotos — ampliar", () => {
  it("começa reduzida, oferecendo ampliar", () => {
    abrir();

    expect(screen.getByRole("button", { name: "Ampliar a foto" })).toBeTruthy();
  });

  it("amplia ao clicar na foto e oferece reduzir", async () => {
    const usuario = userEvent.setup();
    abrir();

    await usuario.click(screen.getByRole("button", { name: "Ampliar a foto" }));

    expect(screen.getByRole("button", { name: "Reduzir a foto" })).toBeTruthy();
  });

  it("alterna pela tecla Z, que funciona sem o foco estar na imagem", async () => {
    const usuario = userEvent.setup();
    abrir();

    await usuario.keyboard("z");
    expect(screen.getByRole("button", { name: "Reduzir a foto" })).toBeTruthy();

    await usuario.keyboard("z");
    expect(screen.getByRole("button", { name: "Ampliar a foto" })).toBeTruthy();
  });

  /** Trocar de foto ampliada deixaria a próxima cortada num canto qualquer. */
  it("volta ao tamanho ajustado ao mudar de foto", async () => {
    const usuario = userEvent.setup();
    abrir();

    await usuario.click(screen.getByRole("button", { name: "Ampliar a foto" }));
    await usuario.click(screen.getByRole("button", { name: "Próxima foto" }));

    expect(screen.getByRole("button", { name: "Ampliar a foto" })).toBeTruthy();
  });
});
