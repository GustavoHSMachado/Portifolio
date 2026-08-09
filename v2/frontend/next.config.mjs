/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Gera .next/standalone — a imagem de produção roda `node server.js`
  // sem precisar de node_modules completo. Ver docker/web/Dockerfile.
  output: "standalone",

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
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
