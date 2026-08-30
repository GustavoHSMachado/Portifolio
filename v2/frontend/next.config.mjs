/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Gera .next/standalone — a imagem de produção roda `node server.js`
  // sem precisar de node_modules completo. Ver docker/web/Dockerfile.
  //
  // Na Vercel, porém, standalone quebra a publicação: o Next passa a escrever
  // os arquivos de rastreamento de dependências dentro de .next/standalone, e
  // o builder da Vercel os procura na raiz de .next/. O build gera as 21
  // páginas e só então morre com
  //   ENOENT ... .next/next-server.js.nft.json
  // A Vercel define VERCEL=1 no ambiente de build; lá deixamos o Next usar a
  // saída padrão, que é o que a plataforma sabe empacotar. O Docker continua
  // recebendo o standalone de sempre.
  output: process.env.VERCEL ? undefined : "standalone",

  // Diretório de saída configurável. Com o servidor de desenvolvimento rodando,
  // um build de produção no mesmo .next mistura os runtimes dev e prod e falha
  // na prerenderização — sintoma que não tem nada a ver com o código.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  // Otimização de imagem — parte do "lazy loading quando fizer sentido".
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  experimental: {
    // Importa só o que é usado do framer-motion e reduz o bundle.
    optimizePackageImports: ["framer-motion"],
  },

  async headers() {
    /*
     * Content-Security-Policy: a última linha de defesa contra XSS.
     *
     * A API já tinha a sua; o site não, e foi um achado da revisão de segurança
     * de 23/08/2026 — na mesma revisão em que apareceu um XSS armazenado real
     * no JSON-LD. Uma política aqui não substitui escapar a saída, mas limita o
     * estrago de qualquer escape que falhe no futuro: sem `connect-src`, o
     * script injetado não consegue enviar o que roubou para fora.
     *
     * 'unsafe-inline' em script-src é exigência do Next em desenvolvimento, que
     * injeta o runtime de recarga; em produção o bundle é servido por arquivo.
     * 'unsafe-eval' fica só fora de produção, onde o React DevTools precisa.
     *
     * connect-src precisa da origem da API, que é outro host — sem ela o
     * navegador bloqueia toda chamada e o site fica sem dados.
     */
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const producao = process.env.NODE_ENV === "production";

    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${producao ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin}`,
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
