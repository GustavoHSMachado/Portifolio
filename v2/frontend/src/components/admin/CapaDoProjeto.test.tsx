import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import type { ProjectImage } from "@/lib/portfolio";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CapaDoProjeto } from "./CapaDoProjeto";

const enviar = vi.fn();
const excluir = vi.fn();

vi.mock("@/lib/portfolio", async () => {
  const real = await vi.importActual<typeof import("@/lib/portfolio")>("@/lib/portfolio");

  return {
    ...real,
    enviarFotoDoProjeto: (...args: unknown[]) => enviar(...args),
    excluirFotoDoProjeto: (...args: unknown[]) => excluir(...args),
  };
});

const CAPA: ProjectImage = {
  id: 9,
  path: "uploads/projetos/capa.png",
  url: "/capa.png",
  alt: "Painel do aplicativo aberto no resumo",
  position: 0,
  isCover: true,
};

/** PNG mínimo: o conteúdo não importa, só o tipo e o tamanho. */
function imagem(nome = "capa.png", tipo = "image/png"): File {
  return new File(["x"], nome, { type: tipo });
}

function montar(capa: ProjectImage | null = null) {
  const onChanged = vi.fn();

  render(
    <ToastProvider>
      <CapaDoProjeto projectId={7} capa={capa} onChanged={onChanged} />
    </ToastProvider>,
  );

  return { onChanged };
}

/**
 * A capa é a única imagem que o visitante vê sem clicar em nada, e trocá-la
 * apaga a anterior do disco. O que se testa aqui é o que protege esse gesto:
 * a descrição obrigatória e a recusa de arquivo inválido antes do envio.
 */
describe("CapaDoProjeto", () => {
  beforeEach(() => {
    enviar.mockReset().mockResolvedValue(undefined);
    excluir.mockReset().mockResolvedValue(undefined);
  });

  it("diz que não há capa quando o projeto ainda não tem", () => {
    montar();

    expect(screen.getByText("Nenhuma capa ainda.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Definir capa" })).toBeTruthy();
  });

  it("mostra a capa atual e oferece trocar", () => {
    montar(CAPA);

    expect(screen.getByAltText(CAPA.alt)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trocar capa" })).toBeTruthy();
  });

  it("avisa que trocar apaga a anterior", () => {
    montar(CAPA);

    expect(screen.getByText(/substitui a atual, que é apagada do disco/)).toBeTruthy();
  });

  it("deixa o botão desligado enquanto nenhum arquivo foi escolhido", () => {
    montar();

    expect(screen.getByRole("button", { name: "Definir capa" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  /**
   * O atributo accept do input ja barra tipo errado, entao o caminho que o
   * componente precisa cobrir sozinho e o tamanho: um PNG de 3 MB passa pelo
   * filtro do navegador e seria recusado so pelo servidor, depois da subida.
   */
  it("recusa imagem acima de 2 MB, sem chamar a API", async () => {
    const usuario = userEvent.setup();
    montar();

    const grande = imagem("print-gigante.png");
    Object.defineProperty(grande, "size", { value: 3 * 1024 * 1024 });

    await usuario.upload(screen.getByLabelText("Enviar capa"), grande);

    expect(screen.getByText(/print-gigante.png/)).toBeTruthy();
    expect(enviar).not.toHaveBeenCalled();
  });

  /** Imagem sem descrição não existe para quem usa leitor de tela. */
  it("exige a descrição antes de enviar", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.upload(screen.getByLabelText("Enviar capa"), imagem());
    await usuario.click(screen.getByRole("button", { name: "Definir capa" }));

    expect(screen.getByText(/Descreva a imagem/)).toBeTruthy();
    expect(enviar).not.toHaveBeenCalled();
  });

  it("envia marcando como capa", async () => {
    const usuario = userEvent.setup();
    const { onChanged } = montar();

    await usuario.upload(screen.getByLabelText("Enviar capa"), imagem());
    await usuario.type(screen.getByLabelText(/Descrição da imagem/), "Tela do resumo");
    await usuario.click(screen.getByRole("button", { name: "Definir capa" }));

    expect(enviar).toHaveBeenCalledWith(7, expect.any(File), "Tela do resumo", true);
    expect(onChanged).toHaveBeenCalled();
  });

  it("remove a capa existente", async () => {
    const usuario = userEvent.setup();
    const { onChanged } = montar(CAPA);

    await usuario.click(screen.getByRole("button", { name: "Remover capa" }));

    expect(excluir).toHaveBeenCalledWith(7, CAPA.id);
    expect(onChanged).toHaveBeenCalled();
  });
});

/**
 * Os caminhos de erro: é onde a pessoa fica sem saber o que aconteceu se o
 * componente engolir a falha. Um envio que falha em silêncio parece sucesso.
 */
describe("CapaDoProjeto — quando a API recusa", () => {
  beforeEach(() => {
    enviar.mockReset();
    excluir.mockReset();
  });

  it("mostra o motivo que o servidor devolveu", async () => {
    const usuario = userEvent.setup();
    enviar.mockRejectedValue(
      new ApiError("Falhou", 422, "validation", { foto: ["O arquivo não é uma imagem válida."] }),
    );
    montar();

    await usuario.upload(screen.getByLabelText("Enviar capa"), imagem());
    await usuario.type(screen.getByLabelText(/Descrição da imagem/), "Tela");
    await usuario.click(screen.getByRole("button", { name: "Definir capa" }));

    expect(screen.getByText("O arquivo não é uma imagem válida.")).toBeTruthy();
  });

  it("cai numa mensagem genérica quando a falha não é da API", async () => {
    const usuario = userEvent.setup();
    enviar.mockRejectedValue(new Error("rede caiu"));
    montar();

    await usuario.upload(screen.getByLabelText("Enviar capa"), imagem());
    await usuario.type(screen.getByLabelText(/Descrição da imagem/), "Tela");
    await usuario.click(screen.getByRole("button", { name: "Definir capa" }));

    expect(screen.getByText("Não foi possível enviar a capa.")).toBeTruthy();
  });

  it("não recarrega o painel quando remover falha", async () => {
    const usuario = userEvent.setup();
    excluir.mockRejectedValue(new Error("falhou"));
    const { onChanged } = montar(CAPA);

    await usuario.click(screen.getByRole("button", { name: "Remover capa" }));

    expect(onChanged).not.toHaveBeenCalled();
  });
});

describe("CapaDoProjeto — seleção vazia", () => {
  beforeEach(() => {
    enviar.mockReset().mockResolvedValue(undefined);
  });

  /** Cancelar a caixa de diálogo volta ao estado inicial, sem reclamar. */
  it("limpa a escolha sem acusar erro", async () => {
    const usuario = userEvent.setup();
    montar();

    const campo = screen.getByLabelText("Enviar capa");
    await usuario.upload(campo, imagem());
    expect(screen.getByRole("button", { name: "Definir capa" }).hasAttribute("disabled")).toBe(
      false,
    );

    await usuario.upload(campo, []);

    expect(screen.getByRole("button", { name: "Definir capa" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.queryByText(/não é JPEG/)).toBeNull();
  });
});
