import { expect, test } from "@playwright/test";

/**
 * Controle de acesso e recusa de credencial.
 *
 * Estes cenários existem porque a v1 falhava exatamente aqui: o painel
 * administrativo checava apenas se havia sessão, e qualquer usuário logado
 * entrava digitando a URL.
 */

test.describe("proteção de rota", () => {
  test("manda para o login quem tenta abrir o painel sem sessão", async ({ page }) => {
    await page.goto("/painel");

    await expect(page).toHaveURL(/\/entrar/);
  });

  // A rota /admin ainda não existe, embora entrar/page.tsx redirecione para ela
  // quando o papel é admin e o painel exiba um link para lá. O teste de acesso
  // entra quando a área existir — afirmar o comportamento atual aqui seria
  // congelar o defeito em forma de teste.
});

test.describe("login", () => {
  test("recusa credencial inválida com mensagem genérica", async ({ page }) => {
    await page.goto("/entrar");

    await page.getByLabel("E-mail").fill("ninguem@portifolio.local");
    await page.getByLabel("Senha", { exact: true }).fill("senhaErrada123");
    await page.getByRole("button", { name: "Entrar" }).click();

    // A mensagem não pode dizer se foi o e-mail ou a senha que falhou:
    // resposta específica vira ferramenta de enumeração de contas.
    const alerta = page.getByRole("alert").first();
    await expect(alerta).toBeVisible();
    await expect(alerta).not.toContainText(/não cadastrad|não existe|inexistente/i);

    await expect(page).toHaveURL(/\/entrar/);
  });

  test("valida o formato do e-mail antes de chamar a API", async ({ page }) => {
    await page.goto("/entrar");

    await page.getByLabel("E-mail").fill("isto-nao-e-um-email");
    await page.getByLabel("Senha", { exact: true }).fill("umaSenhaBoa123");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/entrar/);
  });
});

test.describe("páginas públicas", () => {
  for (const [rota, titulo] of [
    ["/", /portfólio|Gustavo/i],
    ["/entrar", /Entrar/i],
    ["/criar-conta", /Criar conta/i],
    ["/recuperar-senha", /Esqueci minha senha/i],
    ["/legal/termos-de-uso", /Termos/i],
    ["/legal/politica-de-privacidade", /Privacidade/i],
  ] as const) {
    test(`${rota} responde e renderiza conteúdo`, async ({ page }) => {
      const resposta = await page.goto(rota);

      expect(resposta?.status()).toBeLessThan(400);
      await expect(page.getByText(titulo).first()).toBeVisible();
    });
  }
});
