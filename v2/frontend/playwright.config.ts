import { defineConfig, devices } from "@playwright/test";

/**
 * A suíte administrativa roda num projeto só, e fica de fora dos outros cinco.
 *
 * Os cenários dela escrevem em `site_settings`, que é estado global do site.
 * Cinco navegadores salvando ao mesmo tempo se atropelariam, e a falha
 * apareceria como intermitência sem causa — foi o que já aconteceu aqui quando
 * um cenário limpava a caixa do Mailpit que outro esperava. Rodar uma vez, em
 * um navegador, é cobertura suficiente para regra de servidor.
 */
const ADMINISTRACAO = "**/administracao.spec.ts";

/**
 * E2E cobrindo os fluxos que, se quebrarem, quebram o produto:
 * cadastro, confirmação de e-mail, login, recuperação e troca de senha.
 *
 * Rodamos em Chromium, Firefox, WebKit e um viewport mobile — o portfólio
 * é acessado majoritariamente pelo celular.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Encaminha as portas quando os testes rodam dentro do container, para que o
  // navegador enxergue os mesmos endereços de quem navega da máquina.
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Dois workers também fora do CI, e não "metade dos núcleos".
  //
  // Do outro lado há um só servidor de desenvolvimento, que compila sob
  // demanda numa thread. Com quatro navegadores disputando esse gargalo, a
  // suíte falhava entre dois e seis cenários por rodada, sempre em lugares
  // diferentes e por esgotar tempo — chegando a servir página em branco. Com
  // dois, passaram os 70. Vale a pena: uma suíte que falha ao acaso não é
  // consultada, e o que ela deixa de dizer é justamente onde há defeito.
  workers: 2,
  // Mesmo motivo do expect abaixo: fora do CI, cada rota é compilada na
  // primeira visita. Os fluxos longos — criar conta, confirmar por e-mail,
  // recuperar e redefinir a senha, entrar — encadeiam seis navegações e
  // passavam dos 30s por compilação, não por lentidão do produto.
  timeout: process.env.CI ? 30_000 : 60_000,

  // Fora do CI os testes rodam contra o servidor de desenvolvimento, que
  // compila cada rota na primeira visita — o que pode passar de 10s e nada
  // tem a ver com o produto. No CI o webServer faz build de produção antes,
  // então 5s continua sendo um limite honesto lá.
  expect: { timeout: process.env.CI ? 5_000 : 20_000 },

  reporter: process.env.CI
    ? [
        ["html", { open: "never" }],
        ["github"],
        ["json", { outputFile: "test-results/results.json" }],
      ]
    : [["list"]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Reduz flakiness de animação sem desligar o motion do produto.
    actionTimeout: 10_000,
  },

  projects: [
    { name: "chromium", testIgnore: ADMINISTRACAO, use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", testIgnore: ADMINISTRACAO, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", testIgnore: ADMINISTRACAO, use: { ...devices["Desktop Safari"] } },
    { name: "mobile", testIgnore: ADMINISTRACAO, use: { ...devices["Pixel 7"] } },
    {
      // Verifica que a interface continua utilizável sem animação.
      name: "reduced-motion",
      testIgnore: ADMINISTRACAO,
      // reducedMotion é opção do contexto do navegador, não do runner — fora de
      // contextOptions o TypeScript rejeita e a preferência não chega à página.
      use: { ...devices["Desktop Chrome"], contextOptions: { reducedMotion: "reduce" } },
    },
    {
      // Ver o cabeçalho de administracao.spec.ts.
      name: "admin",
      testMatch: ADMINISTRACAO,
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: process.env.CI
    ? {
        command: "npm run build && npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
