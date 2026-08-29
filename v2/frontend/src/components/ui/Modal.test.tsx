import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

/**
 * O Modal concentra os detalhes que costumam faltar em diálogo caseiro:
 * Escape, foco preso dentro, foco devolvido ao gatilho e clique no overlay.
 * São comportamentos invisíveis — ninguém percebe que quebraram até alguém
 * navegando por teclado ficar preso fora do diálogo.
 */
describe("Modal", () => {
  function abrir(props: Partial<Parameters<typeof Modal>[0]> = {}) {
    const onClose = vi.fn();

    render(
      <Modal open onClose={onClose} title="Confirmar exclusão" {...props}>
        <p>Esta ação não pode ser desfeita.</p>
        <button type="button">Confirmar</button>
      </Modal>,
    );

    return { onClose };
  }

  it("não renderiza nada enquanto está fechado", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Invisível">
        <p>conteúdo</p>
      </Modal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("expõe o título como rótulo acessível do diálogo", () => {
    abrir();

    expect(screen.getByRole("dialog", { name: "Confirmar exclusão" })).toBeInTheDocument();
  });

  it("marca o diálogo como modal, para o leitor de tela ignorar o fundo", () => {
    abrir();

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("fecha ao pressionar Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = abrir();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("fecha ao clicar no overlay", async () => {
    const user = userEvent.setup();
    const { onClose } = abrir();

    // O overlay é o pai do diálogo; clicar nele é o gesto de "sair daqui".
    const overlay = screen.getByRole("dialog").parentElement;
    expect(overlay).not.toBeNull();

    await user.click(overlay as HTMLElement);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("não fecha ao clicar dentro do conteúdo", async () => {
    const user = userEvent.setup();
    const { onClose } = abrir();

    await user.click(screen.getByText("Esta ação não pode ser desfeita."));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("move o foco para o diálogo ao abrir", () => {
    abrir();

    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("devolve o foco a quem abriu quando fecha", async () => {
    const user = userEvent.setup();

    function Exemplo() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir
          </button>
          <Modal open={open} onClose={() => setOpen(false)} title="Diálogo">
            <p>corpo</p>
          </Modal>
        </>
      );
    }

    render(<Exemplo />);

    const gatilho = screen.getByRole("button", { name: "Abrir" });
    await user.click(gatilho);
    expect(screen.getByRole("dialog")).toHaveFocus();

    await user.keyboard("{Escape}");

    // Sem isto, quem navega por teclado é jogado de volta ao início da página.
    expect(gatilho).toHaveFocus();
  });

  it("prende o Tab dentro do diálogo", async () => {
    const user = userEvent.setup();
    abrir();

    const fechar = screen.getByRole("button", { name: "Fechar" });
    const confirmar = screen.getByRole("button", { name: "Confirmar" });

    confirmar.focus();
    expect(confirmar).toHaveFocus();

    // Do último elemento, o Tab volta para o primeiro em vez de escapar
    // para a barra de endereços ou para o conteúdo atrás do diálogo.
    await user.tab();
    expect(fechar).toHaveFocus();
  });

  it("volta ao último elemento com Shift+Tab a partir do primeiro", async () => {
    const user = userEvent.setup();
    abrir();

    const fechar = screen.getByRole("button", { name: "Fechar" });
    const confirmar = screen.getByRole("button", { name: "Confirmar" });

    fechar.focus();

    await user.tab({ shift: true });

    expect(confirmar).toHaveFocus();
  });

  it("libera o scroll do body ao fechar", async () => {
    const user = userEvent.setup();

    function Exemplo() {
      const [open, setOpen] = useState(true);

      return (
        <Modal open={open} onClose={() => setOpen(false)} title="Diálogo">
          <p>corpo</p>
        </Modal>
      );
    }

    render(<Exemplo />);
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");

    // Deixar o body travado depois de fechar é o tipo de vazamento que só
    // aparece quando o usuário não consegue mais rolar a página.
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
