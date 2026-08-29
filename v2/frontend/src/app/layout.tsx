import { PageTransition } from "@/components/motion/PageTransition";
import { TemaFlutuante } from "@/components/ui/TemaFlutuante";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/hooks/useAuth";
import { TemaProvider } from "@/hooks/useTema";
import { paletaDeDestaque, paraFundoClaro } from "@/lib/cores";
import { fetchContentSafe } from "@/lib/portfolio";
import { CHAVE_TEMA } from "@/lib/tema";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { CSSProperties, ReactNode } from "react";
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

/*
 * Aplica o tema antes da primeira pintura.
 *
 * Precisa ser síncrono e inline no <head>: qualquer coisa que rode depois — um
 * efeito do React, um script com defer — pinta a página no tema errado e a
 * corrige em seguida, e esse piscar branco no escuro é justamente o defeito que
 * o modo escuro deveria evitar.
 *
 * Sem escolha salva, segue o sistema. O try/catch existe porque localStorage
 * lança em navegação privada de alguns navegadores, e um tema que não carregou
 * não pode derrubar a página inteira.
 */
const APLICAR_TEMA = `(function(){try{var e=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});var c=e?e==="claro":window.matchMedia("(prefers-color-scheme: light)").matches;if(c){document.documentElement.dataset.theme="light"}}catch(_){}})()`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  /*
   * A cor escolhida no painel vale para o site inteiro, e não só para a
   * home: o painel, o login e o currículo usam o mesmo --accent. Por isso a
   * paleta é injetada aqui, no body, de onde desce para qualquer rota.
   *
   * São duas paletas porque a cor escolhida serve a um fundo só — ver
   * paraFundoClaro em lib/cores.ts. Quem decide entre elas é o globals.css.
   */
  const { settings } = await fetchContentSafe();
  const escura = paletaDeDestaque(settings.cor_destaque);
  const clara = paletaDeDestaque(paraFundoClaro(settings.cor_destaque));

  const paleta = {
    "--accent-escuro": escura.accent,
    "--accent-escuro-hover": escura.accentHover,
    "--accent-escuro-active": escura.accentActive,
    "--accent-escuro-subtle": escura.accentSubtle,
    "--accent-escuro-ring": escura.accentRing,

    "--accent-claro": clara.accent,
    // No claro o hover escurece: clarear afastaria o elemento do olho
    // justamente quando o cursor chega nele.
    "--accent-claro-hover": clara.accentActive,
    "--accent-claro-active": paletaDeDestaque(clara.accentActive).accentActive,
    "--accent-claro-subtle": clara.accentSubtle,
    "--accent-claro-ring": clara.accentRing,
  } as CSSProperties;

  return (
    /*
     * suppressHydrationWarning só no <html>, e só por causa do data-theme: o
     * script acima escreve o atributo antes de o React hidratar, então o
     * servidor manda o elemento sem ele e o cliente encontra um com ele. Sem a
     * supressão, o React avisa a cada carregamento sobre a diferença que é o
     * próprio objetivo do script. Vale apenas para este elemento — o conteúdo
     * continua sendo comparado normalmente.
     */
    <html lang="pt-BR" className={openSans.variable} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: precisa ser inline e síncrono para evitar o flash de tema; o conteúdo é uma constante deste arquivo. */}
        <script dangerouslySetInnerHTML={{ __html: APLICAR_TEMA }} />
      </head>
      <body style={paleta}>
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>

        <TemaProvider>
          <AuthProvider>
            <ToastProvider>
              <PageTransition>{children}</PageTransition>

              {/*
                Cobre todas as telas menos a home, que tem o seu na barra
                superior. O canto inferior direito é onde não disputa espaço
                com cabeçalho nenhum.
              */}
              <TemaFlutuante />
            </ToastProvider>
          </AuthProvider>
        </TemaProvider>
      </body>
    </html>
  );
}
