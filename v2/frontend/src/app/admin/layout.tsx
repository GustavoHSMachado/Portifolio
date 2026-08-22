import type { Metadata } from "next";
import type { ReactNode } from "react";

/** Mesmo motivo do /painel: página client, e área administrativa fora do índice. */
export const metadata: Metadata = {
  title: "Painel de conteúdo",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
