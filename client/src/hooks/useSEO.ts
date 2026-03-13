import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: "website" | "article" | "product";
}

const BASE_URL = "https://nutritional-care.manus.space";
const DEFAULT_TITLE = "Nutritional Care - منتجات صحية مختارة";
const DEFAULT_DESC = "اكتشف أفضل المنتجات الصحية المختارة بعناية لمرضى السكري والضغط والسمنة.";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

export function useSEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  url,
  image = DEFAULT_IMAGE,
  type = "website",
}: SEOProps = {}) {
  useEffect(() => {
    const fullTitle = title.includes("Nutritional Care") ? title : `${title} - Nutritional Care`;
    const fullUrl = url ? `${BASE_URL}${url}` : window.location.href;

    // Primary
    document.title = fullTitle;
    setMeta("title", fullTitle);
    setMeta("description", description);

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:image", image, "property");
    setMeta("og:url", fullUrl, "property");
    setMeta("og:type", type, "property");

    // Twitter
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);
    setMeta("twitter:url", fullUrl);

    // Canonical
    setCanonical(fullUrl);
  }, [title, description, url, image, type]);
}
