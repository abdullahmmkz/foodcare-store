import { Router } from "express";
import { getDb } from "../db";
import { products, diseases } from "../../drizzle/schema";
import type { Product, Disease } from "../../drizzle/schema";

export const sitemapRouter = Router();

const BASE_URL = "https://nutritional-care.manus.space";

sitemapRouter.get("/sitemap.xml", async (_req, res) => {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allProducts = await db.select({
      id: products.id,
      updatedAt: products.updatedAt,
    }).from(products);

    const allDiseases = await db.select({
      id: diseases.id,
      updatedAt: diseases.updatedAt,
    }).from(diseases);

    const now = new Date().toISOString().split("T")[0];

    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/login", priority: "0.3", changefreq: "monthly" },
      { url: "/register", priority: "0.3", changefreq: "monthly" },
    ];

    const productPages = allProducts.map((p: Pick<Product, 'id' | 'updatedAt'>) => ({
      url: `/product/${p.id}`,
      priority: "0.8",
      changefreq: "weekly",
      lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split("T")[0] : now,
    }));

    const diseasePages = allDiseases.map((d: Pick<Disease, 'id' | 'updatedAt'>) => ({
      url: `/?disease=${d.id}`,
      priority: "0.7",
      changefreq: "weekly",
      lastmod: d.updatedAt ? new Date(d.updatedAt).toISOString().split("T")[0] : now,
    }));

    const allPages = [
      ...staticPages.map((p) => ({ ...p, lastmod: now })),
      ...productPages,
      ...diseasePages,
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allPages
  .map(
    (page) => `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(xml);
  } catch (err) {
    console.error("Sitemap generation error:", err);
    res.status(500).send("Error generating sitemap");
  }
});
