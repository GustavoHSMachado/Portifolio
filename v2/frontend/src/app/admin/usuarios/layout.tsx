import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Tela de dados pessoais: fora dos buscadores, por princípio.
 *
 * O acesso já exige sessão de administrador, então nenhum robô chegaria ao
 * conteúdo. O noindex é a segunda camada — vale pela URL em si, que não precisa
 * aparecer em resultado de busca.
 */
export const metadata: Metadata = {
  title: "Usuários",
  robots: { index: false, follow: false },
};

export default function UsuariosLayout({ children }: { children: ReactNode }) {
  return children;
}
