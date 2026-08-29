import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Acessos e registros",
  robots: { index: false, follow: false },
};

export default function AcessosLayout({ children }: { children: ReactNode }) {
  return children;
}
