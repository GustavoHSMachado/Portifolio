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
        // Catraca, não meta. Fixados no valor medido hoje para que a cobertura
        // não possa cair; sobem a cada bloco de teste novo. A meta continua
        // sendo 70, e o que falta para chegar lá é useAuth e api.ts, ambos
        // sem nenhum teste ainda.
        lines: 40,
        functions: 55,
        branches: 70,
        statements: 40,
      },
    },
  },
});
