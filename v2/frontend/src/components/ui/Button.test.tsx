import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("usa type=button por padrão", () => {
    render(<Button>Salvar</Button>);

    // Sem isto, um botão dentro de <form> submeteria a página por engano.
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("respeita o type informado", () => {
    render(<Button type="submit">Enviar</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("dispara o clique quando está livre", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Salvar</Button>);
    await user.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledOnce();
  });

  describe("durante o carregamento", () => {
    it("anuncia o progresso a leitores de tela", () => {
      render(<Button loading>Salvar</Button>);

      const botao = screen.getByRole("button");

      // Feedback visual sem par acessível é meio trabalho.
      expect(botao).toHaveAttribute("aria-busy", "true");
      expect(botao).toBeDisabled();
    });

    it("ignora cliques", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <Button loading onClick={onClick}>
          Salvar
        </Button>,
      );
      await user.click(screen.getByRole("button"));

      expect(onClick).not.toHaveBeenCalled();
    });

    it("mantém o rótulo no documento para o botão não encolher", () => {
      render(<Button loading>Salvar alterações</Button>);

      // O rótulo é escondido por visibility, não removido: se saísse do DOM,
      // o botão mudaria de largura e o layout saltaria a cada submit.
      expect(screen.getByText("Salvar alterações")).toBeInTheDocument();
    });
  });

  it("continua bloqueado quando desabilitado", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    );
    await user.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
  });

  it("não anuncia progresso quando não está carregando", () => {
    render(<Button>Salvar</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false");
  });
});
