import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox";

/**
 * O ponto do Checkbox é preservar o input nativo. Estes testes existem para
 * impedir que alguém "melhore" o componente trocando por div com role, que é
 * o caminho mais curto para quebrar teclado, autofill e leitor de tela.
 */
describe("Checkbox", () => {
  it("expõe um checkbox de verdade, ligado ao rótulo", () => {
    render(<Checkbox label="Aceito os termos" />);

    expect(screen.getByRole("checkbox", { name: "Aceito os termos" })).toBeInTheDocument();
  });

  it("alterna ao clicar no rótulo", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Aceito os termos" />);

    const caixa = screen.getByRole("checkbox");
    expect(caixa).not.toBeChecked();

    await user.click(screen.getByText("Aceito os termos"));

    expect(caixa).toBeChecked();
  });

  it("alterna pelo teclado", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Aceito os termos" />);

    const caixa = screen.getByRole("checkbox");
    caixa.focus();

    await user.keyboard(" ");

    expect(caixa).toBeChecked();
  });

  it("avisa a mudança a quem controla o formulário", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Checkbox label="Aceito" onChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));

    expect(onChange).toHaveBeenCalledOnce();
  });

  it("liga o erro à caixa, não apenas ao lado dela", () => {
    render(<Checkbox label="Aceito" error="É preciso aceitar para continuar" />);

    const caixa = screen.getByRole("checkbox");
    const erro = screen.getByRole("alert");

    expect(caixa).toHaveAttribute("aria-invalid", "true");
    expect(caixa.getAttribute("aria-describedby")).toBe(erro.id);
    expect(erro).toHaveTextContent("É preciso aceitar para continuar");
  });

  it("não marca como inválido sem erro", () => {
    render(<Checkbox label="Aceito" />);

    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("respeita o estado desabilitado", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Aceito" disabled />);

    const caixa = screen.getByRole("checkbox");
    await user.click(caixa);

    expect(caixa).toBeDisabled();
    expect(caixa).not.toBeChecked();
  });
});
