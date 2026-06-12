import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/profile", "/api/"] },
    sitemap: "https://hearless16-ej8b.vercel.app/sitemap.xml",
  };
}
