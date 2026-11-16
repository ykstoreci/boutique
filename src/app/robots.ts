import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/catalogue", "/categories", "/categories/*", "/products/*", "/contact"],
        disallow: ["/boutick", "/boutick/*", "/api/*", "/orders/confirmation"],
      },
    ],
    sitemap: "/sitemap.xml",
  };
}

