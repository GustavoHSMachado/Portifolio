import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

/**
 * Sitemap das páginas públicas.
 *
 * São só três — a home e os dois documentos legais. Listar as telas de acesso
 * seria pedir a indexação de formulário de login, que não tem o que ranquear e
 * ainda concorre com a home pela mesma consulta de marca.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "monthly", priority: 1 },
    {
      url: `${SITE_URL}/legal/termos-de-uso`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/legal/politica-de-privacidade`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
