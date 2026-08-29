import { expect, test } from "@playwright/test";
import {
  aguardarEmail,
  entrar,
  extrairCodigo,
  extrairToken,
  preencherEEnviar,
} from "./helpers/mailpit";

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
    // A política exige maiúscula, minúscula, número e símbolo, com sete no mínimo.
    senha: "umaSenhaBoa123!",
  };
}

test.describe("cadastro e confirmação de e-mail", () => {
  test("cria a conta, confirma pelo link e entra", async ({ page, request }) => {
    const usuario = usuarioNovo();

    await page.goto("/criar-conta");

    await aceitarTermos(page);

    // A tela confirma o envio sem revelar se o e-mail já existia.
    await preencherEEnviar(
      [
        [page.getByLabel("Nome completo"), usuario.nome],
        [page.getByLabel("E-mail"), usuario.email],
        [page.getByLabel("Telefone"), usuario.telefone],
        [page.getByLabel("Senha", { exact: true }), usuario.senha],
        [page.getByLabel("Confirmar senha"), usuario.senha],
      ],
      page.getByRole("button", { name: "Criar conta" }),
      page.getByText("Confira seu e-mail"),
    );

    const corpo = await aguardarEmail(request, usuario.email, { assunto: "Confirme seu e-mail" });
    const token = extrairToken(corpo);

    await page.goto(`/confirmar-email?token=${token}`);
    await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();

    await entrar(page, request, usuario.email, usuario.senha);

    await expect(page).toHaveURL(/\/painel/);
    await expect(page.getByRole("heading", { name: /Olá, Gustavo/i })).toBeVisible();
  });

  test("senha correta sozinha não abre sessão", async ({ page, request }) => {
    const usuario = usuarioNovo();

    await page.goto("/criar-conta");
    await aceitarTermos(page);
    await preencherEEnviar(
      [
        [page.getByLabel("Nome completo"), usuario.nome],
        [page.getByLabel("E-mail"), usuario.email],
        [page.getByLabel("Telefone"), usuario.telefone],
        [page.getByLabel("Senha", { exact: true }), usuario.senha],
        [page.getByLabel("Confirmar senha"), usuario.senha],
      ],
      page.getByRole("button", { name: "Criar conta" }),
      page.getByText("Confira seu e-mail"),
    );

    const confirmacao = extrairToken(
      await aguardarEmail(request, usuario.email, { assunto: "Confirme seu e-mail" }),
    );
    await page.goto(`/confirmar-email?token=${confirmacao}`);
    await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();

    // O primeiro passo é a senha, e ele não pode entregar sessão nenhuma.
    await page.goto("/entrar");
    await preencherEEnviar(
      [
        [page.getByLabel("E-mail"), usuario.email],
        [page.getByLabel("Senha", { exact: true }), usuario.senha],
      ],
      page.getByRole("button", { name: "Entrar" }),
      page.getByRole("heading", { name: "Confirme que é você" }),
    );
    await expect(page).toHaveURL(/\/entrar/);

    // E o painel continua fechado enquanto o código não for confirmado.
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("recusa um código de acesso errado", async ({ page, request }) => {
    const usuario = usuarioNovo();

    await page.goto("/criar-conta");
    await aceitarTermos(page);
    await preencherEEnviar(
      [
        [page.getByLabel("Nome completo"), usuario.nome],
        [page.getByLabel("E-mail"), usuario.email],
        [page.getByLabel("Telefone"), usuario.telefone],
        [page.getByLabel("Senha", { exact: true }), usuario.senha],
        [page.getByLabel("Confirmar senha"), usuario.senha],
      ],
      page.getByRole("button", { name: "Criar conta" }),
      page.getByText("Confira seu e-mail"),
    );

    const confirmacao = extrairToken(
      await aguardarEmail(request, usuario.email, { assunto: "Confirme seu e-mail" }),
    );
    await page.goto(`/confirmar-email?token=${confirmacao}`);
    await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();

    await page.goto("/entrar");
    await preencherEEnviar(
      [
        [page.getByLabel("E-mail"), usuario.email],
        [page.getByLabel("Senha", { exact: true }), usuario.senha],
      ],
      page.getByRole("button", { name: "Entrar" }),
      page.getByRole("heading", { name: "Confirme que é você" }),
    );

    const codigoReal = extrairCodigo(
      await aguardarEmail(request, usuario.email, { assunto: "Seu código de acesso" }),
    );
    const codigoErrado = codigoReal === "0000000" ? "1111111" : "0000000";

    await preencherEEnviar(
      [[page.getByLabel("Código"), codigoErrado]],
      page.getByRole("button", { name: "Confirmar e entrar" }),
      page.getByRole("alert").first(),
    );

    await expect(page).toHaveURL(/\/entrar/);
  });

  test("recusa um token de confirmação inválido", async ({ page }) => {
    await page.goto(`/confirmar-email?token=${"0".repeat(64)}`);

    await expect(page.getByRole("heading", { name: /Link expirado|Não deu certo/ })).toBeVisible();
  });

  test("consome o token uma única vez", async ({ page, request }) => {
    const usuario = usuarioNovo();

    await page.goto("/criar-conta");
    await aceitarTermos(page);
    await preencherEEnviar(
      [
        [page.getByLabel("Nome completo"), usuario.nome],
        [page.getByLabel("E-mail"), usuario.email],
        [page.getByLabel("Telefone"), usuario.telefone],
        [page.getByLabel("Senha", { exact: true }), usuario.senha],
        [page.getByLabel("Confirmar senha"), usuario.senha],
      ],
      page.getByRole("button", { name: "Criar conta" }),
      page.getByText("Confira seu e-mail"),
    );

    const token = extrairToken(
      await aguardarEmail(request, usuario.email, { assunto: "Confirme seu e-mail" }),
    );

    await page.goto(`/confirmar-email?token=${token}`);
    await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();

    // Reapresentar o mesmo link não pode voltar a valer: token de uso único é
    // o que impede reaproveitamento de um e-mail vazado ou encaminhado.
    await page.goto(`/confirmar-email?token=${token}`);
    await expect(page.getByRole("heading", { name: /Link expirado|Não deu certo/ })).toBeVisible();
  });
});

test.describe("recuperação de senha", () => {
  test("envia o link sem revelar se a conta existe", async ({ page }) => {
    const inexistente = `nao-existe-${Date.now()}@portifolio.local`;

    await page.goto("/recuperar-senha");
    // Mensagem genérica de propósito: resposta diferente para e-mail existente
    // transforma o formulário em ferramenta de enumeração de contas.
    await preencherEEnviar(
      [[page.getByLabel("E-mail"), inexistente]],
      page.getByRole("button", { name: "Enviar link" }),
      page.getByText("Verifique seu e-mail"),
    );
  });

  test("permite definir uma senha nova e entrar com ela", async ({ page, request }) => {
    const usuario = usuarioNovo();
    const senhaNova = "outraSenhaBoa456!";

    await page.goto("/criar-conta");
    await aceitarTermos(page);
    await preencherEEnviar(
      [
        [page.getByLabel("Nome completo"), usuario.nome],
        [page.getByLabel("E-mail"), usuario.email],
        [page.getByLabel("Telefone"), usuario.telefone],
        [page.getByLabel("Senha", { exact: true }), usuario.senha],
        [page.getByLabel("Confirmar senha"), usuario.senha],
      ],
      page.getByRole("button", { name: "Criar conta" }),
      page.getByText("Confira seu e-mail"),
    );

    const confirmacao = extrairToken(
      await aguardarEmail(request, usuario.email, { assunto: "Confirme seu e-mail" }),
    );
    await page.goto(`/confirmar-email?token=${confirmacao}`);
    await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();

    // As duas etapas da recuperação vivem na mesma rota desde que o token de
    // 64 caracteres deu lugar ao código de 7 dígitos: um código não pode
    // viajar pela URL, onde ficaria no histórico e nos logs de intermediários.
    await page.goto("/recuperar-senha");
    await preencherEEnviar(
      [[page.getByLabel("E-mail"), usuario.email]],
      page.getByRole("button", { name: "Enviar link" }),
      page.getByText("Verifique seu e-mail"),
    );

    const codigoReset = extrairCodigo(
      await aguardarEmail(request, usuario.email, { assunto: "Código para redefinir sua senha" }),
    );

    await preencherEEnviar(
      [
        [page.getByLabel("Código recebido"), codigoReset],
        [page.getByLabel("Nova senha", { exact: true }), senhaNova],
        [page.getByLabel("Confirmar nova senha"), senhaNova],
      ],
      page.getByRole("button", { name: "Salvar nova senha" }),
      page.getByRole("heading", { name: "Entrar" }),
    );

    // O toHaveURL confirma que a redefinição terminou: quem redireciona é a
    // própria tela, ao receber a resposta da API. Sem ele havia um goto direto
    // aqui, que cancelava a requisição em voo — e o login seguinte tentava a
    // senha nova numa conta que ainda guardava a antiga.
    await expect(page).toHaveURL(/\/entrar/);

    // O login acontece em outra aba, e não nesta.
    //
    // A tela de login chega aqui por navegação do lado do cliente, com o
    // PageTransition desmontando uma rota e montando a outra. Digitar no meio
    // disso não funciona: o campo recebe o texto e a montagem o limpa, o
    // formulário vai vazio e a resposta é "Campo obrigatório". Nenhuma espera
    // resolveu — verificar o valor antes do clique não impede a montagem de
    // acontecer logo depois, e tanto goto quanto reload disputam com a
    // navegação em curso ("interrupted by another navigation" no WebKit,
    // "NS_BINDING_ABORTED" no Firefox).
    //
    // Uma aba nova não tem navegação pendente nem transição para atrapalhar, e
    // compartilha o mesmo contexto — os cookies são os mesmos, então o que se
    // exercita continua sendo a sessão de verdade.
    const abaLogin = await page.context().newPage();

    await entrar(abaLogin, request, usuario.email, senhaNova);

    await expect(abaLogin).toHaveURL(/\/painel/);
  });
});
