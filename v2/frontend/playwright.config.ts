import { defineConfig, devices } from "@playwright/test";

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
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,

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
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      // Verifica que a interface continua utilizável sem animação.
      name: "reduced-motion",
      // reducedMotion é opção do contexto do navegador, não do runner — fora de
      // contextOptions o TypeScript rejeita e a preferência não chega à página.
      use: { ...devices["Desktop Chrome"], contextOptions: { reducedMotion: "reduce" } },
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
