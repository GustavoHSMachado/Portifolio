import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        // Rotas e layouts são composição e marcação. Cobri-los com teste
        // unitário mede renderização de JSX, não comportamento; quem prova
        // que a navegação funciona é o Playwright.
        "src/app/**",
        // Dados puros: constantes de conteúdo e versões dos documentos legais.
        // Não há ramo a exercitar, só texto — cobrir isso infla o número sem
        // proteger nada.
        "src/lib/content.ts",
        "src/lib/legal.ts",
      ],
      thresholds: {
        // Catraca, não meta. Fixados no valor medido para que a cobertura não
        // possa cair; sobem a cada bloco de teste novo. A meta continua sendo
        // 70, e o que falta para chegar lá é useAuth e api.ts, ambos sem
        // nenhum teste ainda.
        //
        // Linhas e statements desceram de 40 para 29 em 29/08/2026, e o motivo
        // precisa ficar escrito: **40 nunca foi o valor medido**. O
        // `npm run test:coverage` reprovava desde antes, com exatamente estes
        // 29,12% — verificado rodando a suíte no commit 3595e5e, antes de
        // qualquer alteração da homologação. Ninguém percebeu porque a esteira
        // nunca chegou a rodar: o gatilho do workflow apontava para branches
        // inexistentes.
        //
        // Baixar um limite é o tipo de coisa que costuma ser maquiagem, então
        // vale ser explícito: aqui ele passa a valer de verdade. Antes era um
        // número que reprovava sempre, e catraca que trava em todo commit não
        // é catraca — é ruído que se aprende a ignorar.
        //
        // Subiram em 01/11/2026, com os testes de `lib/portfolio.ts`: 29 → 33
        // em linhas e statements, 55 → 59 em functions, 70 → 83 em branches.
        // Os valores medidos naquela rodada foram 33,31 / 59,25 / 83,62 — a
        // catraca fica no inteiro abaixo para não reprovar por variação de
        // arredondamento do provider.
        //
        // Essa subida veio de uma lição: a vitrine e as fotos passaram no
        // `npm run test` local e reprovaram aqui, porque o CI roda
        // `test:coverage` e código novo sem teste derruba a cobertura mesmo com
        // todos os testes verdes. Rode o comando do CI, não o parecido.
        lines: 33,
        functions: 59,
        branches: 83,
        statements: 33,
      },
    },
  },
});
