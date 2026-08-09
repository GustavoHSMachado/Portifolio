import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { PageTransition } from "@/components/motion/PageTransition";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/hooks/useAuth";
import "@/styles/globals.css";

/**
 * Open Sans herdada da v1 — decisão de produto.
 * `display: swap` evita texto invisível durante o carregamento da fonte (FOIT),
 * que é uma das causas mais comuns de layout shift e de "página travada".
 */
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-open-sans",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
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
            <div id="conteudo">
              <PageTransition>{children}</PageTransition>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
