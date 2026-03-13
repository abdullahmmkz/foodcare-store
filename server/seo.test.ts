import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("SEO Files", () => {
  it("robots.txt exists and contains correct content", () => {
    const robotsPath = path.resolve(process.cwd(), "client/public/robots.txt");
    expect(fs.existsSync(robotsPath)).toBe(true);
    const content = fs.readFileSync(robotsPath, "utf-8");
    expect(content).toContain("User-agent: *");
    expect(content).toContain("Allow: /");
    expect(content).toContain("Disallow: /admin");
    expect(content).toContain("Sitemap: https://nutritional-care.manus.space/sitemap.xml");
  });

  it("index.html has proper Page Title with Arabic keywords", () => {
    const htmlPath = path.resolve(process.cwd(), "client/index.html");
    expect(fs.existsSync(htmlPath)).toBe(true);
    const content = fs.readFileSync(htmlPath, "utf-8");
    // Title should contain both Arabic and English
    expect(content).toContain("Nutritional Care");
    expect(content).toContain("رعاية غذائية");
    // Title should contain health keywords
    expect(content).toContain("السكري");
    expect(content).toContain("الضغط");
    expect(content).toContain("السمنة");
  });

  it("index.html has Meta Description", () => {
    const htmlPath = path.resolve(process.cwd(), "client/index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");
    expect(content).toContain('name="description"');
    // Description should be descriptive (more than 50 chars)
    const descMatch = content.match(/name="description"\s+content="([^"]+)"/);
    expect(descMatch).toBeTruthy();
    expect(descMatch![1].length).toBeGreaterThan(50);
  });

  it("index.html has Open Graph tags", () => {
    const htmlPath = path.resolve(process.cwd(), "client/index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");
    expect(content).toContain('property="og:title"');
    expect(content).toContain('property="og:description"');
    expect(content).toContain('property="og:image"');
    expect(content).toContain('property="og:url"');
    expect(content).toContain('property="og:type"');
  });

  it("index.html has Twitter Card tags", () => {
    const htmlPath = path.resolve(process.cwd(), "client/index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");
    expect(content).toContain('name="twitter:card"');
    expect(content).toContain('name="twitter:title"');
    expect(content).toContain('name="twitter:image"');
  });

  it("index.html has Schema Markup (JSON-LD)", () => {
    const htmlPath = path.resolve(process.cwd(), "client/index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");
    expect(content).toContain('type="application/ld+json"');
    expect(content).toContain('"@context": "https://schema.org"');
    expect(content).toContain('"@type": "WebSite"');
    expect(content).toContain('"@type": "Organization"');
  });

  it("index.html has canonical link", () => {
    const htmlPath = path.resolve(process.cwd(), "client/index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");
    expect(content).toContain('rel="canonical"');
    expect(content).toContain("nutritional-care.manus.space");
  });
});

describe("Page Routes", () => {
  it("About page file exists", () => {
    const aboutPath = path.resolve(process.cwd(), "client/src/pages/About.tsx");
    expect(fs.existsSync(aboutPath)).toBe(true);
  });

  it("Privacy page file exists", () => {
    const privacyPath = path.resolve(process.cwd(), "client/src/pages/Privacy.tsx");
    expect(fs.existsSync(privacyPath)).toBe(true);
  });

  it("App.tsx registers /about and /privacy routes", () => {
    const appPath = path.resolve(process.cwd(), "client/src/App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    expect(content).toContain('path="/about"');
    expect(content).toContain('path="/privacy"');
  });
});
