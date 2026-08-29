import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("liga o rótulo ao campo", () => {
    render(<Input label="E-mail" />);

    // getByLabelText só encontra se a associação existir de verdade.
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  });

  it("gera identificadores próprios para conviver com vários campos na tela", () => {
    render(
      <>
        <Input label="Nome" />
        <Input label="Sobrenome" />
      </>,
    );

    const nome = screen.getByLabelText("Nome");
    const sobrenome = screen.getByLabelText("Sobrenome");

    expect(nome.id).not.toBe(sobrenome.id);
  });

  describe("quando há erro", () => {
    it("marca o campo como inválido e o descreve", () => {
      render(<Input label="E-mail" error="Informe um e-mail válido" />);

      const campo = screen.getByLabelText("E-mail");
      const erro = screen.getByRole("alert");

      expect(campo).toHaveAttribute("aria-invalid", "true");
      expect(erro).toHaveTextContent("Informe um e-mail válido");
      // O erro precisa estar ligado ao campo, não apenas próximo dele na tela.
      expect(campo.getAttribute("aria-describedby")).toContain(erro.id);
    });

    it("esconde a dica, para não competir com o erro", () => {
      render(<Input label="Senha" hint="Mínimo de 8 caracteres" error="Senha muito curta" />);

      expect(screen.queryByText("Mínimo de 8 caracteres")).not.toBeInTheDocument();
      expect(screen.getByText("Senha muito curta")).toBeInTheDocument();
    });
  });

  it("mostra a dica quando não há erro", () => {
    render(<Input label="Senha" hint="Mínimo de 8 caracteres" />);

    expect(screen.getByText("Mínimo de 8 caracteres")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("aria-invalid", "false");
  });

  describe("campo de senha revelável", () => {
    it("começa oculto", () => {
      render(<Input label="Senha" revealable />);

      expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
      expect(screen.getByRole("button", { name: "Mostrar senha" })).toBeInTheDocument();
    });

    it("alterna entre mostrar e ocultar", async () => {
      const user = userEvent.setup();
      render(<Input label="Senha" revealable />);

      await user.click(screen.getByRole("button", { name: "Mostrar senha" }));

      expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");

      await user.click(screen.getByRole("button", { name: "Ocultar senha" }));

      expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    });

    it("preserva o texto digitado ao revelar", async () => {
      const user = userEvent.setup();
      render(<Input label="Senha" revealable />);

      const campo = screen.getByLabelText("Senha");
      await user.type(campo, "umaSenhaBoa123");
      await user.click(screen.getByRole("button", { name: "Mostrar senha" }));

      expect(screen.getByLabelText("Senha")).toHaveValue("umaSenhaBoa123");
    });
  });

  it("não oferece botão de revelar em campo comum", () => {
    render(<Input label="Nome" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
