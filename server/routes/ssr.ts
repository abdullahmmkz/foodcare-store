import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { products, diseases } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

export const ssrRouter = Router();

const BASE_URL = "https://nutritional-care.manus.space";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectMeta(html: string, meta: {
  title: string;
  description: string;
  image?: string;
  url: string;
}): string {
  const { title, description, image, url } = meta;
  const ogImage = image || `${BASE_URL}/og-image.png`;

  const metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="title" content="${escapeHtml(title)}" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />`;

  // Replace existing title and inject new meta tags before </head>
  return html
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace("</head>", `${metaTags}\n  </head>`);
}

// SSR for product pages: /product/:id
ssrRouter.get("/product/:id", async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) return res.status(404).send("Not found");

    const db = await getDb();
    if (!db) return res.status(500).send("Database unavailable");

    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        image: products.image,
        link: products.link,
        diseaseId: products.diseaseId,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) return res.status(404).send("Product not found");

    const [disease] = await db
      .select({ nameAr: diseases.nameAr })
      .from(diseases)
      .where(eq(diseases.id, product.diseaseId))
      .limit(1);

    const distPath = path.resolve(process.cwd(), "dist/public/index.html");
    if (!fs.existsSync(distPath)) {
      // In dev mode, skip SSR and let Vite handle it
      return res.status(404).send("SSR only available in production");
    }

    let html = fs.readFileSync(distPath, "utf-8");

    const categoryName = disease?.nameAr || "صحة";
    html = injectMeta(html, {
      title: `${product.name} - Nutritional Care`,
      description: `منتج صحي مختار لـ ${categoryName}: ${product.name}. اكتشف أفضل المنتجات الصحية على Nutritional Care.`,
      image: product.image,
      url: `${BASE_URL}/product/${product.id}`,
    });

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  } catch (err) {
    console.error("SSR error:", err);
    res.status(500).send("Server error");
  }
});
