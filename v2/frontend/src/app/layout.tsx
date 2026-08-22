import { PageTransition } from "@/components/motion/PageTransition";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/hooks/useAuth";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "@/styles/globals.css";

/**
 * Open Sans herdada da v1 — decisão de produto.
 *
 * Servida de um arquivo versionado, e não buscada no Google durante o build:
 * ver src/app/fonts/README.md. É a mesma fonte variável que o Google entrega,
 * no subconjunto latino.
 *
 * `display: swap` evita texto invisível durante o carregamento da fonte (FOIT),
 * que é uma das causas mais comuns de layout shift e de "página travada".
 */
const openSans = localFont({
  src: "./fonts/open-sans-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-open-sans",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
  /* Ajusta as métricas da fonte de reserva às da Open Sans, para o texto não
     mudar de tamanho quando a real chega. É o que mantém o CLS em zero. */
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Gustavo Henrique — Portfólio",
    template: "%s · Gustavo Henrique",
  },
  description:
    "Portfólio de Gustavo Henrique Santos Machado, profissional de T.I. apaixonado por tecnologia, desafios e inovação.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Gustavo Henrique — Portfólio",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A v1 usava user-scalable=no, que impede zoom e falha em acessibilidade.
  maximumScale: 5,
  themeColor: "#0b0b0f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={openSans.variable}>
      <body>
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>

        <AuthProvider>
          <ToastProvider>
            <PageTransition>{children}</PageTransition>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
