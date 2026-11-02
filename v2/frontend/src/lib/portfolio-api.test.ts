import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O contrato entre as telas e a API: caminho, verbo e corpo.
 *
 * Estes testes não exercitam rede — o cliente de API é substituído. O que eles
 * travam é aquilo que nenhum tipo pega e que o compilador aceita feliz: um PUT
 * escrito como POST, um `/api/v1/admin/...` que perdeu o `admin` e virou rota
 * pública, um id interpolado na posição errada. Errar qualquer um desses dá 404
 * ou 401 em produção, e o sintoma aparece longe da causa.
 */
const api = {
  get: vi.fn(() => Promise.resolve({ data: { projects: [] } })),
  post: vi.fn(() => Promise.resolve({ data: null })),
  put: vi.fn(() => Promise.resolve({ data: null })),
  delete: vi.fn(() => Promise.resolve({ data: null })),
};

vi.mock("./api", () => ({
  api,
  getAccessToken: () => null,
  ApiError: class extends Error {},
}));

const {
  fetchProjects,
  fetchAdminContent,
  saveItem,
  deleteItem,
  enviarFotoDoProjeto,
  salvarFotoDoProjeto,
  excluirFotoDoProjeto,
  fetchUsuarios,
  bloquearConta,
  liberarConta,
  excluirConta,
  fetchAuditoria,
  fetchAjustes,
  salvarAjustes,
  saveProfile,
} = await import("./portfolio");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("leitura pública", () => {
  /**
   * skipAuth é o detalhe que importa: a rota é pública desde 01/11/2026, e sem
   * ele um 401 vindo de outro lugar faria o cliente gastar uma rotação de
   * refresh para buscar algo que não depende de sessão nenhuma.
   */
  it("busca os projetos sem autenticação", async () => {
    await fetchProjects();

    expect(api.get).toHaveBeenCalledWith("/api/v1/projects", { skipAuth: true });
  });
});

describe("conteúdo do painel", () => {
  it("lê o conteúdo administrativo", async () => {
    await fetchAdminContent();

    expect(api.get).toHaveBeenCalledWith("/api/v1/admin/content");
  });

  /** Sem id é criação (POST); com id é atualização (PUT). */
  it("cria com POST quando não há id", async () => {
    await saveItem("projects", null, { title: "Novo" });

    expect(api.post).toHaveBeenCalledWith("/api/v1/admin/projects", { title: "Novo" });
    expect(api.put).not.toHaveBeenCalled();
  });

  it("atualiza com PUT quando há id", async () => {
    await saveItem("skills", 7, { name: "PHP" });

    expect(api.put).toHaveBeenCalledWith("/api/v1/admin/skills/7", { name: "PHP" });
    expect(api.post).not.toHaveBeenCalled();
  });

  it("exclui pelo caminho da coleção", async () => {
    await deleteItem("experiences", 3);

    expect(api.delete).toHaveBeenCalledWith("/api/v1/admin/experiences/3");
  });

  it("salva o perfil com PUT", async () => {
    await saveProfile({
      fullName: "Gustavo",
      shortName: "Gustavo",
      role: "Desenvolvedor",
      headline: "",
      objective: null,
      summary: "",
      city: null,
      state: null,
      websiteUrl: null,
      githubUrl: null,
      linkedinUrl: null,
      whatsappUrl: null,
    });

    expect(api.put).toHaveBeenCalledWith(
      "/api/v1/admin/profile",
      expect.objectContaining({
        fullName: "Gustavo",
      }),
    );
  });
});

describe("fotos dos projetos", () => {
  /**
   * O corpo precisa ser FormData, e não JSON: é o que faz o cliente omitir o
   * Content-Type e deixar o navegador montar o boundary do multipart. Com JSON,
   * $_FILES chega vazio no servidor.
   */
  it("envia a foto como FormData, com o arquivo e a descrição", async () => {
    const arquivo = new File(["bytes"], "print.png", { type: "image/png" });

    await enviarFotoDoProjeto(4, arquivo, "Tela inicial");

    expect(api.post).toHaveBeenCalledTimes(1);
    const [caminho, corpo] = api.post.mock.calls[0] as unknown as [string, FormData];

    expect(caminho).toBe("/api/v1/admin/projects/4/images");
    expect(corpo).toBeInstanceOf(FormData);
    expect(corpo.get("alt")).toBe("Tela inicial");
    expect(corpo.get("foto")).toBe(arquivo);
  });

  it("atualiza descrição e ordem pelo id da foto", async () => {
    await salvarFotoDoProjeto(4, 9, { alt: "Outra", position: 2 });

    expect(api.put).toHaveBeenCalledWith("/api/v1/admin/projects/4/images/9", {
      alt: "Outra",
      position: 2,
    });
  });

  it("exclui a foto pelo projeto e pelo id", async () => {
    await excluirFotoDoProjeto(4, 9);

    expect(api.delete).toHaveBeenCalledWith("/api/v1/admin/projects/4/images/9");
  });
});

describe("contas e auditoria", () => {
  it("lista as contas", async () => {
    await fetchUsuarios();

    expect(api.get).toHaveBeenCalledWith("/api/v1/admin/users");
  });

  /** Bloquear e liberar são POST em subcaminhos distintos da mesma conta. */
  it("bloqueia e libera pela ação no caminho", async () => {
    await bloquearConta(5);
    await liberarConta(5);

    expect(api.post).toHaveBeenNthCalledWith(1, "/api/v1/admin/users/5/lock");
    expect(api.post).toHaveBeenNthCalledWith(2, "/api/v1/admin/users/5/unlock");
  });

  it("exclui a conta com DELETE", async () => {
    await excluirConta(5);

    expect(api.delete).toHaveBeenCalledWith("/api/v1/admin/users/5");
  });

  it("busca a auditoria sem filtro", async () => {
    await fetchAuditoria();

    expect(api.get).toHaveBeenCalledWith("/api/v1/admin/audit");
  });

  /** O evento vai na query e precisa ser escapado: ele vem de entrada livre. */
  it("escapa o filtro de evento na query", async () => {
    await fetchAuditoria("login.senha incorreta");

    expect(api.get).toHaveBeenCalledWith("/api/v1/admin/audit?event=login.senha%20incorreta");
  });
});

describe("ajustes do site", () => {
  it("lê e salva os ajustes", async () => {
    await fetchAjustes();
    await salvarAjustes({ cor_destaque: "#5aa9ff" });

    expect(api.get).toHaveBeenCalledWith("/api/v1/admin/settings");
    expect(api.put).toHaveBeenCalledWith("/api/v1/admin/settings", {
      cor_destaque: "#5aa9ff",
    });
  });
});
