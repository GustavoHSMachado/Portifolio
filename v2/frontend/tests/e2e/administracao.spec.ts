import { type APIRequestContext, type Page, expect, test } from "@playwright/test";
import { aguardarEmail, entrar, extrairToken } from "./helpers/mailpit";

/**
 * Área administrativa.
 *
 * Era a maior parte do sistema sem cobertura E2E, e a que tem mais poder:
 * bloquear conta, excluir conta e reescrever o conteúdo público do site. A
 * homologação de 29/08/2026 a validou por HTTP, uma vez, à mão — o que não
 * impede uma regressão silenciosa amanhã.
 *
 * O obstáculo era o segundo fator: ADMIN_EMAIL amarrava o painel a um endereço
 * real, e o código de 7 dígitos sairia por SMTP em vez de cair no Mailpit.
 * Resolvido fazendo ADMIN_EMAIL aceitar lista (ver RequireAdmin) e incluindo
 * admin@portifolio.local no ambiente local — domínio reservado, que o
 * MailService desvia para a captura. A conta nasce de:
 *
 *     docker compose exec -T api php database/seed-e2e-admin.php
 *
 * que o `make test-e2e` executa antes da suíte.
 *
 * ── Por que este arquivo roda em um projeto só ──────────────────────────
 *
 * Os demais specs rodam nos cinco perfis em paralelo. Este não pode: os testes
 * de aparência escrevem em `site_settings`, que é estado global do site. Cinco
 * navegadores salvando cores diferentes ao mesmo tempo se atropelariam, e a
 * falha apareceria como intermitência sem causa aparente — exatamente o que já
 * aconteceu nesta suíte quando um cenário limpava a caixa do Mailpit que outro
 * esperava. O playwright.config restringe este arquivo ao projeto `admin`, e o
 * `serial` abaixo garante ordem dentro dele.
 */
test.describe.configure({ mode: "serial" });

const ADMIN_EMAIL = "admin@portifolio.local";
const ADMIN_SENHA = "AdminE2E#2026";

const API = process.env.E2E_API_URL ?? "http://localhost:8001";
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

/**
 * Esvazia a caixa do administrador antes de disparar um código novo.
 *
 * Os demais specs usam um endereço diferente por cenário, então nunca
 * precisaram disto. Aqui o endereço é sempre o mesmo, e `aguardarEmail`
 * devolve a mensagem mais recente que **já existe** — sem esperar pela
 * próxima. Sem limpar, um cenário lia o código do cenário anterior, já
 * consumido, e a falha aparecia como "código inválido" sem causa aparente.
 *
 * Apagar aqui é seguro porque este arquivo roda sozinho, em um projeto só e em
 * modo serial: nenhum outro cenário está esperando mensagem deste endereço.
 */
async function limparCaixaDoAdmin(request: APIRequestContext): Promise<void> {
  const busca = await request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${ADMIN_EMAIL}`)}`,
  );

  if (!busca.ok()) {
    return;
  }

  const { messages = [] } = (await busca.json()) as { messages?: Array<{ ID: string }> };

  if (messages.length === 0) {
    return;
  }

  await request.delete(`${MAILPIT}/api/v1/messages`, {
    data: { IDs: messages.map((mensagem) => mensagem.ID) },
  });
}

/** Entra pela tela como administrador e espera a sessão firmar. */
async function entrarComoAdmin(page: Page, request: APIRequestContext): Promise<void> {
  await limparCaixaDoAdmin(request);
  await entrar(page, request, ADMIN_EMAIL, ADMIN_SENHA);

  /*
   * Espera o destino antes de devolver. entrar() clica em "Confirmar e entrar"
   * e retorna sem aguardar nada; sem esta espera, a navegação seguinte disputa
   * com a sessão sendo criada e o guard do cliente manda para /entrar.
   *
   * E o destino é /admin, não /painel: a tela de login encaminha quem tem papel
   * de admin direto para o painel administrativo. Vale como asserção — se esse
   * encaminhamento sumir, este helper falha e todos os cenários abaixo caem
   * junto, apontando a causa.
   */
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });
}

/** Cria uma conta comum confirmada, direto pela API. */
async function criarContaComum(
  request: APIRequestContext,
): Promise<{ email: string; senha: string }> {
  const email = `comum-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@portifolio.local`;
  const senha = "ContaComum#2026";

  const criada = await request.post(`${API}/api/v1/auth/register`, {
    data: {
      name: "Conta Comum E2E",
      email,
      phone: "11987654321",
      password: senha,
      password_confirmation: senha,
      acceptedTerms: true,
    },
  });

  expect(criada.status()).toBe(201);

  const token = extrairToken(
    await aguardarEmail(request, email, { assunto: "Confirme seu e-mail" }),
  );

  const confirmada = await request.post(`${API}/api/v1/auth/verify-email`, { data: { token } });

  expect(confirmada.ok()).toBeTruthy();

  return { email, senha };
}

/** O access token de uma sessão administrativa, para falar direto com a API. */
async function tokenDeAdmin(request: APIRequestContext): Promise<string> {
  await limparCaixaDoAdmin(request);

  const primeiro = await request.post(`${API}/api/v1/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_SENHA },
  });

  expect(primeiro.status()).toBe(200);

  const corpo = await aguardarEmail(request, ADMIN_EMAIL, { assunto: "Seu código de acesso" });
  const codigo = corpo.match(/letter-spacing:10px[^>]*>(\d{7})</)?.[1];

  expect(codigo, "o código do segundo fator não veio no e-mail").toBeTruthy();

  const segundo = await request.post(`${API}/api/v1/auth/login/verify`, {
    data: { email: ADMIN_EMAIL, code: codigo },
  });

  expect(segundo.status()).toBe(200);

  const { data } = (await segundo.json()) as { data: { accessToken: string } };

  return data.accessToken;
}

test.describe("controle de acesso à área administrativa", () => {
  test("manda para o login quem tenta abrir /admin sem sessão", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/entrar/);
  });

  /**
   * O cenário mais importante do arquivo.
   *
   * Confere as duas metades separadamente, porque só a segunda é controle de
   * acesso: o redirecionamento é conveniência de navegação, e esconder a tela
   * no front não protege nada. Se um dia o guard do cliente for removido por
   * engano, a asserção do 403 continua reprovando.
   */
  test("conta comum não alcança o painel nem os dados", async ({ page, request }) => {
    const { email, senha } = await criarContaComum(request);

    await entrar(page, request, email, senha);
    await expect(page).toHaveURL(/\/painel/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/painel/, { timeout: 15_000 });

    // A parte que realmente importa: o servidor recusa, com ou sem tela.
    const primeiro = await request.post(`${API}/api/v1/auth/login`, {
      data: { email, password: senha },
    });

    expect(primeiro.status()).toBe(200);

    const corpo = await aguardarEmail(request, email, { assunto: "Seu código de acesso" });
    const codigo = corpo.match(/letter-spacing:10px[^>]*>(\d{7})</)?.[1];
    const sessao = await request.post(`${API}/api/v1/auth/login/verify`, {
      data: { email, code: codigo },
    });
    const { data } = (await sessao.json()) as { data: { accessToken: string } };

    for (const rota of [
      "/api/v1/admin/users",
      "/api/v1/admin/audit",
      "/api/v1/admin/content",
      "/api/v1/admin/settings",
    ]) {
      const resposta = await request.get(`${API}${rota}`, {
        headers: { authorization: `Bearer ${data.accessToken}` },
      });

      expect(resposta.status(), `${rota} deveria recusar conta comum`).toBe(403);
    }
  });
});

test.describe("painel administrativo", () => {
  test("abre as três telas com o conteúdo esperado", async ({ page, request }) => {
    await entrarComoAdmin(page, request);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Conteúdo do portfólio" })).toBeVisible();

    await page.goto("/admin/usuarios");
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();

    await page.goto("/admin/acessos");
    await expect(page.getByRole("heading", { name: "Acessos e registros" })).toBeVisible();
  });

  /**
   * Regra de negócio que só existe no servidor, e cujo sintoma é irrecuperável
   * pela interface: um administrador que se tranca para fora do próprio painel
   * não tem como voltar sem acesso ao banco.
   */
  test("recusa bloquear e excluir a própria conta", async ({ request }) => {
    const token = await tokenDeAdmin(request);
    const cabecalho = { authorization: `Bearer ${token}` };

    const eu = await request.get(`${API}/api/v1/me`, { headers: cabecalho });
    const { data: perfil } = (await eu.json()) as { data: { id: number } };

    const bloqueio = await request.post(`${API}/api/v1/admin/users/${perfil.id}/lock`, {
      headers: cabecalho,
    });

    expect(bloqueio.status()).toBe(403);

    const exclusao = await request.delete(`${API}/api/v1/admin/users/${perfil.id}`, {
      headers: cabecalho,
    });

    expect(exclusao.status()).toBe(403);

    // E continua entrando depois da tentativa.
    const ainda = await request.get(`${API}/api/v1/admin/users`, { headers: cabecalho });

    expect(ainda.status()).toBe(200);
  });

  test("bloqueia uma conta, impede a entrada, e libera de volta", async ({ request }) => {
    const { email, senha } = await criarContaComum(request);
    const token = await tokenDeAdmin(request);
    const cabecalho = { authorization: `Bearer ${token}` };

    const lista = await request.get(`${API}/api/v1/admin/users`, { headers: cabecalho });
    const { data } = (await lista.json()) as {
      data: { users: Array<{ id: number; email: string }> };
    };
    const alvo = data.users.find((conta) => conta.email === email);

    expect(alvo, "a conta recém-criada precisa aparecer na listagem").toBeTruthy();

    const bloqueio = await request.post(`${API}/api/v1/admin/users/${alvo?.id}/lock`, {
      headers: cabecalho,
    });

    expect(bloqueio.status()).toBe(200);

    const recusado = await request.post(`${API}/api/v1/auth/login`, {
      data: { email, password: senha },
    });

    expect(recusado.status(), "conta bloqueada não pode entrar").toBe(423);

    const liberacao = await request.post(`${API}/api/v1/admin/users/${alvo?.id}/unlock`, {
      headers: cabecalho,
    });

    expect(liberacao.status()).toBe(200);

    const aceito = await request.post(`${API}/api/v1/auth/login`, {
      data: { email, password: senha },
    });

    expect(aceito.status(), "conta liberada volta a entrar").toBe(200);
  });

  /**
   * Fecha o ciclo inteiro: painel → API → banco → revalidação do cache → home
   * pública. É o caminho que a homologação verificou por partes e que ninguém
   * exercitava de ponta a ponta.
   */
  test("um texto salvo no painel aparece na home pública", async ({ page, request }) => {
    const token = await tokenDeAdmin(request);
    const cabecalho = { authorization: `Bearer ${token}` };

    const antes = await request.get(`${API}/api/v1/admin/settings`, { headers: cabecalho });
    const { data: original } = (await antes.json()) as {
      data: { settings: Record<string, string> };
    };

    const novoTitulo = `Projetos ${Date.now()}`;

    try {
      const salvo = await request.put(`${API}/api/v1/admin/settings`, {
        headers: cabecalho,
        data: { projetos_titulo: novoTitulo },
      });

      expect(salvo.status()).toBe(200);

      // A home é renderizada no servidor e cacheada; o painel avisa por aqui.
      await request.post("/api/revalidar", { headers: cabecalho });

      await page.goto("/");
      await expect(page.getByText(novoTitulo)).toBeVisible({ timeout: 20_000 });
    } finally {
      // Restaura sempre, inclusive se a asserção acima falhar: deixar o título
      // de um teste na home é pior que o teste vermelho.
      await request.put(`${API}/api/v1/admin/settings`, {
        headers: cabecalho,
        data: { projetos_titulo: original.settings.projetos_titulo ?? "" },
      });
      await request.post("/api/revalidar", { headers: cabecalho });
    }
  });

  test("os registros de auditoria acompanham o que foi feito", async ({ request }) => {
    const token = await tokenDeAdmin(request);

    const registros = await request.get(`${API}/api/v1/admin/audit`, {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(registros.status()).toBe(200);

    const { data } = (await registros.json()) as { data: { events: Array<{ event: string }> } };
    const eventos = data.events.map((linha) => linha.event);

    expect(
      eventos.length,
      "a trilha não pode estar vazia depois dos cenários acima",
    ).toBeGreaterThan(0);

    /*
     * Os eventos que os cenários anteriores necessariamente produziram. Não é
     * uma lista exaustiva de propósito: afirmar sobre tudo que o sistema grava
     * transformaria qualquer evento novo numa falha deste teste.
     */
    expect(eventos).toContain("login.concluido");
    expect(eventos).toContain("usuario.bloqueado_pelo_admin");
    expect(eventos).toContain("usuario.liberado_pelo_admin");
  });
});
