import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Fora do índice: a página exige sessão, e o que um rastreador veria é a tela
 * de carregamento. A rota é a mesma que a home anuncia para quem chega.
 */
export const metadata: Metadata = {
  title: "Projetos",
  robots: { index: false, follow: false },
};

export default function ProjetosLayout({ children }: { children: ReactNode }) {
  return children;
}
