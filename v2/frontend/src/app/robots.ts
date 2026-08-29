import { PRIVATE_PATHS, SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

/**
 * robots.txt gerado no build.
 *
 * O bloqueio da área autenticada é higiene de indexação, não segurança: robots
 * é uma convenção que rastreador educado respeita e atacante ignora. Quem
 * protege /painel e /admin é o middleware da API.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS.map((path) => `${path}/`),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
