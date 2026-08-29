import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * A página é um Client Component e não pode exportar metadata; este layout
 * existe para isso. Área autenticada fora do índice: o conteúdo depende de
 * sessão, então o que um rastreador veria é a tela de carregamento.
 */
export const metadata: Metadata = {
  title: "Seu painel",
  robots: { index: false, follow: false },
};

export default function PainelLayout({ children }: { children: ReactNode }) {
  return children;
}
