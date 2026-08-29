import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast";

/**
 * O toast é o par acessível do feedback visual: erro precisa interromper a
 * leitura, sucesso não. É a diferença entre role="alert" e role="status", e é
 * o tipo de detalhe que se perde numa refatoração distraída.
 *
 * Os toasts são disparados chamando a API do contexto dentro de act(), e não
 * clicando com userEvent. O userEvent não convive bem com timers falsos — a
 * espera interna dele fica presa num relógio que não corre — e a expiração
 * automática só é testável controlando o tempo.
 */
describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function montar() {
    let api: ReturnType<typeof useToast> | undefined;

    function Captura() {
      api = useToast();

      return null;
    }

    render(
      <ToastProvider>
        <Captura />
      </ToastProvider>,
    );

    if (!api) {
      throw new Error("o contexto do toast não foi capturado");
    }

    return api;
  }

  it("não mostra nada antes de alguma ação", () => {
    montar();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("anuncia sucesso sem interromper a leitura", () => {
    const toast = montar();

    act(() => toast.success("Salvo com sucesso"));

    expect(screen.getByRole("status")).toHaveTextContent("Salvo com sucesso");
  });

  it("anuncia erro de forma assertiva", () => {
    const toast = montar();

    act(() => toast.error("Falha ao salvar"));

    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("Falha ao salvar");
    expect(alerta).toHaveAttribute("aria-live", "assertive");
  });

  it("agrupa as notificações numa região identificada", () => {
    const toast = montar();

    act(() => toast.info("Só informando"));

    expect(screen.getByRole("region", { name: "Notificações" })).toBeInTheDocument();
  });

  it("limita a pilha para não cobrir a tela", () => {
    const toast = montar();

    act(() => {
      for (const n of [1, 2, 3, 4, 5]) {
        toast.info(`Aviso ${n}`);
      }
    });

    // Empilhar sem limite transforma feedback em obstáculo.
    expect(screen.getAllByRole("status")).toHaveLength(3);
    expect(screen.queryByText("Aviso 1")).not.toBeInTheDocument();
    expect(screen.getByText("Aviso 5")).toBeInTheDocument();
  });

  it("deixa o erro mais tempo na tela que o sucesso", () => {
    // Verifica o prazo agendado, não o desaparecimento visual: a saída passa
    // pelo AnimatePresence, que mantém o nó no DOM enquanto anima. O que
    // importa aqui é a regra — falha exige leitura, sucesso é reconhecido num
    // relance —, e ela está no prazo, não na animação.
    const agendar = vi.spyOn(globalThis, "setTimeout");
    const toast = montar();

    act(() => {
      toast.success("Salvo com sucesso");
      toast.error("Falha ao salvar");
    });

    const prazos = agendar.mock.calls.map(([, delay]) => delay);

    expect(prazos).toContain(4000);
    expect(prazos).toContain(6500);

    agendar.mockRestore();
  });

  it("permite fechar antes do tempo", async () => {
    const user = userEvent.setup();
    const toast = montar();

    act(() => toast.info("Só informando"));
    expect(screen.getByText("Só informando")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar notificação" }));

    // waitFor porque a saída é animada: o nó só deixa o DOM ao fim da transição.
    await waitFor(() => {
      expect(screen.queryByText("Só informando")).not.toBeInTheDocument();
    });
  });
});
