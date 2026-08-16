import { expect, test } from "@playwright/test";
import { aguardarEmail, extrairToken, limparCaixa } from "./helpers/mailpit";

/**
 * O caminho completo da conta: cadastrar, confirmar o e-mail, entrar.
 *
 * É o fluxo que, se quebrar, quebra o produto — e o único que atravessa
 * frontend, API, banco e envio de e-mail de uma vez. Cada teste cria o próprio
 * usuário, com endereço único, para poder rodar em paralelo sem colidir na
 * restrição de e-mail único da tabela users.
 */

/**
 * Marca o aceite dos termos pelo teclado.
 *
 * O input do Checkbox é visualmente oculto e o <label> cobre a área — clicar
 * nele faria o Playwright reclamar de interceptação, e o rótulo contém links,
 * então um clique no lugar errado navegaria para os Termos. Focar e apertar
 * espaço é o que um usuário de teclado faz, e exercita o input nativo que o
 * componente faz questão de preservar.
 */
async function aceitarTermos(page: import("@playwright/test").Page) {
  await page.getByRole("checkbox").focus();
  await page.keyboard.press(" ");
  await expect(page.getByRole("checkbox")).toBeChecked();
}

function usuarioNovo() {
  const carimbo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    nome: "Gustavo Henrique",
    email: `teste-${carimbo}@portifolio.local`,
    telefone: "31986585208",
    senha: "umaSenhaBoa123",
  };
}

test.describe("cadastro e confirmação de e-mail", () => {
  test("cria a conta, confirma pelo link e entra", async ({ page, request }) => {
    const usuario = usuarioNovo();

    await page.goto("/criar-conta");

    await page.getByLabel("Nome completo").fill(usuario.nome);
    await page.getByLabel("E-mail").fill(usuario.email);
    await page.getByLabel("Telefone").fill(usuario.telefone);
    await page.getByLabel("Senha", { exact: true }).fill(usuario.senha);
    await page.getByLabel("Confirmar senha").fill(usuario.senha);
    await aceitarTermos(page);

    await page.getByRole("button", { name: "Criar conta" }).click();

    // A tela confirma o envio sem revelar se o e-mail já existia.
    await expect(page.getByText("Confira seu e-mail")).toBeVisible();

    const corpo = await aguardarEmail(request, usuario.email);
    const token = extrairToken(corpo);

    await page.goto(`/confirmar-email?token=${token}`);
    await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();

    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(usuario.email);
    await page.getByLabel("Senha", { exact: true }).fill(usuario.senha);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/painel/);
    await expect(page.getByRole("heading", { name: /Olá, Gustavo/i })).toBeVisible();
  });

  test("recusa um token de confirmação inválido", async ({ page }) => {
    await page.goto(`/confirmar-email?token=${"0".repeat(64)}`);

    await expect(page.getByRole("heading", { name: /Link expirado|Não deu certo/ })).toBeVisible();
  });

  test("consome o token uma única vez", async ({ page, request }) => {
    const usuario = usuarioNovo();

    await page.goto("/criar-conta");
    await page.getByLabel("Nome completo").fill(usuario.nome);
    await page.getByLabel("E-mail").fill(usuario.email);
    await page.getByLabel("Telefone").fill(usuario.telefone);
    await page.getByLabel("Senha", { exact: true }).fill(usuario.senha);
    await page.getByLabel("Confirmar senha").fill(usuario.senha);
    await aceitarTermos(page);
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Confira seu e-mail")).toBeVisible();

    const token = extrairToken(await aguardarEmail(request, usuario.email));

    await page.goto(`/confirmar-email?token=${token}`);
    await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();

    // Reapresentar o mesmo link não pode voltar a valer: token de uso único é
    // o que impede reaproveitamento de um e-mail vazado ou encaminhado.
    await page.goto(`/confirmar-email?token=${token}`);
    await expect(page.getByRole("heading", { name: /Link expirado|Não deu certo/ })).toBeVisible();
  });
});

test.describe("recuperação de senha", () => {
  test("envia o link sem revelar se a conta existe", async ({ page, request }) => {
    await limparCaixa(request);

    const inexistente = `nao-existe-${Date.now()}@portifolio.local`;

    await page.goto("/recuperar-senha");
    await page.getByLabel("E-mail").fill(inexistente);
    await page.getByRole("button", { name: "Enviar link" }).click();

    // Mensagem genérica de propósito: resposta diferente para e-mail existente
    // transforma o formulário em ferramenta de enumeração de contas.
    await expect(page.getByText("Verifique seu e-mail")).toBeVisible();
  });

  test("permite definir uma senha nova e entrar com ela", async ({ page, request }) => {
    const usuario = usuarioNovo();
    const senhaNova = "outraSenhaBoa456";

    await page.goto("/criar-conta");
    await page.getByLabel("Nome completo").fill(usuario.nome);
    await page.getByLabel("E-mail").fill(usuario.email);
    await page.getByLabel("Telefone").fill(usuario.telefone);
    await page.getByLabel("Senha", { exact: true }).fill(usuario.senha);
    await page.getByLabel("Confirmar senha").fill(usuario.senha);
    await aceitarTermos(page);
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Confira seu e-mail")).toBeVisible();

    const confirmacao = extrairToken(await aguardarEmail(request, usuario.email));
    await page.goto(`/confirmar-email?token=${confirmacao}`);
    await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();

    await limparCaixa(request);

    await page.goto("/recuperar-senha");
    await page.getByLabel("E-mail").fill(usuario.email);
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(page.getByText("Verifique seu e-mail")).toBeVisible();

    const reset = extrairToken(await aguardarEmail(request, usuario.email));

    await page.goto(`/redefinir-senha?token=${reset}`);
    await page.getByLabel("Nova senha", { exact: true }).fill(senhaNova);
    await page.getByLabel("Confirmar nova senha").fill(senhaNova);
    await page.getByRole("button", { name: "Salvar nova senha" }).click();

    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(usuario.email);
    await page.getByLabel("Senha", { exact: true }).fill(senhaNova);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/painel/);
  });
});
