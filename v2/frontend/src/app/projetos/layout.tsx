import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * No índice desde 01/11/2026, quando a listagem deixou de exigir sessão. O
 * rastreador vê a mesma tela que o visitante: os projetos publicados.
 */
export const metadata: Metadata = {
  title: "Projetos",
  description:
    "Projetos que construí, com o problema que apareceu, as decisões que tomei e o resultado.",
};

export default function ProjetosLayout({ children }: { children: ReactNode }) {
  return children;
}
