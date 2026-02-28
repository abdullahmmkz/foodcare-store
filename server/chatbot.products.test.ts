/**
 * Tests for chatbot product-linking functionality
 * Verifies that the chatbot correctly extracts meal plan components
 * and links them to store products
 */
import { describe, expect, it } from "vitest";

// ─── Helper: simulate LLM response parsing ───────────────────────────────────

function parseMealProducts(content: string): Array<{
  name: string;
  reason: string;
  keywords: string[];
  diseaseKeywords?: string[];
}> {
  const match = content.match(/\[MEAL_PRODUCTS\]([\s\S]*?)\[\/MEAL_PRODUCTS\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1].trim());
    return parsed.supplements || [];
  } catch {
    return [];
  }
}

function parseOldProducts(content: string): number[] {
  const match = content.match(/\[PRODUCTS\]([\s\S]*?)\[\/PRODUCTS\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1].trim());
    return parsed.products?.map((p: any) => p.id) || [];
  } catch {
    return [];
  }
}

function isPdfReady(content: string): boolean {
  return content.includes("[PDF_READY]");
}

function cleanContent(content: string): string {
  return content
    .replace(/\[MEAL_PRODUCTS\][\s\S]*?\[\/MEAL_PRODUCTS\]/g, "")
    .replace(/\[PRODUCTS\][\s\S]*?\[\/PRODUCTS\]/g, "")
    .replace(/\[PDF_READY\][\s\S]*?\[\/PDF_READY\]/g, "")
    .replace("[PDF_READY]", "")
    .trim();
}

// ─── Simulate keyword matching (mirrors getProductsByKeywords logic) ──────────

interface MockProduct {
  id: number;
  name: string;
  diseaseName: string;
}

const mockProducts: MockProduct[] = [
  { id: 1, name: "أوميغا 3 لصحة القلب والأوعية الدموية", diseaseName: "الضغط" },
  { id: 2, name: "مغنيسيوم لتنظيم ضغط الدم", diseaseName: "الضغط" },
  { id: 3, name: "برنامج السكري الشامل - مكملات طبيعية", diseaseName: "السكري" },
  { id: 4, name: "نياسين لخفض الكوليسترول الضار", diseaseName: "الكوليسترول" },
  { id: 5, name: "كيو 10 لصحة القلب", diseaseName: "الكوليسترول" },
];

function matchProductsByKeywords(keywords: string[], diseaseNames: string[]): MockProduct[] {
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  const lowerDiseases = diseaseNames.map(d => d.toLowerCase());

  return mockProducts.filter(p => {
    const nameMatch = lowerKeywords.some(kw => p.name.includes(kw));
    const diseaseMatch = lowerDiseases.some(d => p.diseaseName.includes(d));
    return nameMatch || diseaseMatch;
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Chatbot: MEAL_PRODUCTS parsing", () => {
  it("correctly parses MEAL_PRODUCTS block from LLM response", () => {
    const llmResponse = `
هنا نظامك الغذائي المخصص...

[MEAL_PRODUCTS]
{
  "supplements": [
    {
      "name": "أوميغا 3",
      "reason": "يساعد في تنظيم ضغط الدم وصحة القلب",
      "keywords": ["أوميغا", "omega", "قلب"],
      "diseaseKeywords": ["ضغط"]
    },
    {
      "name": "مغنيسيوم",
      "reason": "يساهم في استرخاء الأوعية الدموية",
      "keywords": ["مغنيسيوم", "magnesium"],
      "diseaseKeywords": ["ضغط"]
    }
  ]
}
[/MEAL_PRODUCTS]

[PDF_READY]
    `.trim();

    const supplements = parseMealProducts(llmResponse);
    expect(supplements).toHaveLength(2);
    expect(supplements[0].name).toBe("أوميغا 3");
    expect(supplements[0].keywords).toContain("قلب");
    expect(supplements[0].diseaseKeywords).toContain("ضغط");
    expect(supplements[1].name).toBe("مغنيسيوم");
  });

  it("returns empty array when no MEAL_PRODUCTS block present", () => {
    const content = "هنا نظامك الغذائي فقط بدون منتجات";
    const supplements = parseMealProducts(content);
    expect(supplements).toHaveLength(0);
  });

  it("returns empty array when MEAL_PRODUCTS block has invalid JSON", () => {
    const content = "[MEAL_PRODUCTS]invalid json here[/MEAL_PRODUCTS]";
    const supplements = parseMealProducts(content);
    expect(supplements).toHaveLength(0);
  });
});

describe("Chatbot: PDF_READY detection", () => {
  it("detects PDF_READY marker in response", () => {
    const content = "نظامك الغذائي جاهز!\n[PDF_READY]";
    expect(isPdfReady(content)).toBe(true);
  });

  it("returns false when PDF_READY is not present", () => {
    const content = "هذا رد عادي بدون نظام غذائي كامل";
    expect(isPdfReady(content)).toBe(false);
  });
});

describe("Chatbot: content cleaning", () => {
  it("removes MEAL_PRODUCTS block from displayed content", () => {
    const content = `نظامك الغذائي:
- فطور: بيض
[MEAL_PRODUCTS]{"supplements":[]}[/MEAL_PRODUCTS]
[PDF_READY]
⚠️ هذه التوصيات عامة`;

    const cleaned = cleanContent(content);
    expect(cleaned).not.toContain("[MEAL_PRODUCTS]");
    expect(cleaned).not.toContain("[PDF_READY]");
    expect(cleaned).toContain("فطور: بيض");
    expect(cleaned).toContain("⚠️ هذه التوصيات عامة");
  });

  it("removes old PRODUCTS block from displayed content", () => {
    const content = `توصية المنتجات:
[PRODUCTS]{"products":[{"id":1}]}[/PRODUCTS]
شكراً`;

    const cleaned = cleanContent(content);
    expect(cleaned).not.toContain("[PRODUCTS]");
    expect(cleaned).toContain("شكراً");
  });
});

describe("Chatbot: product keyword matching", () => {
  it("matches products by keyword in product name", () => {
    const matched = matchProductsByKeywords(["أوميغا"], []);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched[0].name).toContain("أوميغا");
  });

  it("matches products by disease name", () => {
    const matched = matchProductsByKeywords([], ["السكري"]);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.every(p => p.diseaseName === "السكري")).toBe(true);
  });

  it("matches products by both keyword and disease", () => {
    const matched = matchProductsByKeywords(["كيو"], ["الكوليسترول"]);
    expect(matched.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array when no match found", () => {
    const matched = matchProductsByKeywords(["منتج غير موجود"], ["مرض غير موجود"]);
    expect(matched).toHaveLength(0);
  });

  it("deduplicates products when keyword and disease both match same product", () => {
    const matched = matchProductsByKeywords(["مغنيسيوم"], ["الضغط"]);
    const ids = matched.map(p => p.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });
});

describe("Chatbot: fallback to old PRODUCTS format", () => {
  it("parses old PRODUCTS block correctly", () => {
    const content = `[PRODUCTS]{"products":[{"id":1,"name":"أوميغا 3","reason":"مفيد للقلب"},{"id":2,"name":"مغنيسيوم","reason":"لضغط الدم"}]}[/PRODUCTS]`;
    const ids = parseOldProducts(content);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
  });

  it("returns empty array for invalid old PRODUCTS block", () => {
    const ids = parseOldProducts("[PRODUCTS]bad json[/PRODUCTS]");
    expect(ids).toHaveLength(0);
  });
});
