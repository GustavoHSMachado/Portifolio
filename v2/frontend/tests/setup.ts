import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom não implementa matchMedia, que o prefers-reduced-motion consulta.
//
// addListener e removeListener são a API antiga de MediaQueryList, depreciada
// mas ainda usada pelo framer-motion para detectar prefers-reduced-motion. Sem
// elas, qualquer componente com motion quebra ao montar — e como a suíte nunca
// tinha sido executada, o mock incompleto passou despercebido.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// crypto.randomUUID é usado pelo ToastProvider.
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => Math.random().toString(36).slice(2) },
  });
}
