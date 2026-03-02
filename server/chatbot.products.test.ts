/**
 * Tests for chatbot symptom analyzer functionality
 * Verifies that the chatbot correctly extracts symptom analysis blocks,
 * severity levels, and links them to store products
 */
import { describe, expect, it } from "vitest";

// ─── Helper: parse SYMPTOM_ANALYSIS block ─────────────────────────────────────

function parseSymptomAnalysis(content: string): {
  symptoms: string[];
  possibleCauses: string[];
  severity: "low" | "medium" | "high";
  recommendations: Array<{ name: string; reason: string; keywords: string[]; diseaseKeywords?: string[] }>;
} | null {
  const match = content.match(/\[SYMPTOM_ANALYSIS\]([\s\S]*?)\[\/SYMPTOM_ANALYSIS\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    return {
      symptoms: parsed.symptoms || [],
      possibleCauses: parsed.possibleCauses || [],
      severity: parsed.severity || "low",
      recommendations: parsed.recommendations || [],
    };
  } catch {
    return null;
  }
}

function isReferDoctor(content: string): boolean {
  return content.includes("[REFER_DOCTOR]");
}

function cleanContent(content: string): string {
  return content
    .replace(/\[SYMPTOM_ANALYSIS\][\s\S]*?\[\/SYMPTOM_ANALYSIS\]/g, "")
    .replace(/\[REFER_DOCTOR\]/g, "")
    .trim();
}

// ─── Simulate product keyword matching ────────────────────────────────────────

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
  { id: 5, name: "فيتامين D3 + K2 لصحة العظام", diseaseName: "المفاصل" },
  { id: 6, name: "حديد عضوي لعلاج فقر الدم", diseaseName: "المناعة" },
  { id: 7, name: "فيتامين B12 للطاقة والأعصاب", diseaseName: "المناعة" },
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

describe("Symptom Analyzer: SYMPTOM_ANALYSIS block parsing", () => {
  it("correctly parses full SYMPTOM_ANALYSIS block", () => {
    const llmResponse = `
بناءً على الأعراض التي ذكرتها، يبدو أن هناك نقصاً في بعض العناصر الغذائية.

[SYMPTOM_ANALYSIS]
{
  "symptoms": ["دوخة", "إرهاق"],
  "possibleCauses": ["نقص الحديد", "نقص فيتامين B12", "انخفاض ضغط الدم"],
  "severity": "medium",
  "recommendations": [
    {
      "name": "حديد عضوي",
      "reason": "يساعد في علاج فقر الدم المسبب للدوخة والإرهاق",
      "keywords": ["حديد", "فقر الدم", "iron"],
      "diseaseKeywords": ["المناعة"]
    },
    {
      "name": "فيتامين B12",
      "reason": "ضروري لإنتاج الطاقة ووظائف الأعصاب",
      "keywords": ["B12", "فيتامين", "طاقة"],
      "diseaseKeywords": ["المناعة"]
    }
  ]
}
[/SYMPTOM_ANALYSIS]
    `.trim();

    const analysis = parseSymptomAnalysis(llmResponse);
    expect(analysis).not.toBeNull();
    expect(analysis!.symptoms).toContain("دوخة");
    expect(analysis!.symptoms).toContain("إرهاق");
    expect(analysis!.possibleCauses).toContain("نقص الحديد");
    expect(analysis!.severity).toBe("medium");
    expect(analysis!.recommendations).toHaveLength(2);
    expect(analysis!.recommendations[0].name).toBe("حديد عضوي");
    expect(analysis!.recommendations[0].keywords).toContain("حديد");
  });

  it("returns null when no SYMPTOM_ANALYSIS block present", () => {
    const content = "أخبرني أكثر عن الأعراض التي تشعر بها.";
    expect(parseSymptomAnalysis(content)).toBeNull();
  });

  it("returns null for invalid JSON in SYMPTOM_ANALYSIS block", () => {
    const content = "[SYMPTOM_ANALYSIS]invalid json[/SYMPTOM_ANALYSIS]";
    expect(parseSymptomAnalysis(content)).toBeNull();
  });

  it("handles missing optional fields gracefully", () => {
    const content = `[SYMPTOM_ANALYSIS]{"symptoms":["صداع"],"severity":"low"}[/SYMPTOM_ANALYSIS]`;
    const analysis = parseSymptomAnalysis(content);
    expect(analysis).not.toBeNull();
    expect(analysis!.symptoms).toContain("صداع");
    expect(analysis!.possibleCauses).toEqual([]);
    expect(analysis!.recommendations).toEqual([]);
  });
});

describe("Symptom Analyzer: severity levels", () => {
  it("correctly identifies low severity", () => {
    const content = `[SYMPTOM_ANALYSIS]{"symptoms":["تعب خفيف"],"possibleCauses":["قلة نوم"],"severity":"low","recommendations":[]}[/SYMPTOM_ANALYSIS]`;
    const analysis = parseSymptomAnalysis(content);
    expect(analysis!.severity).toBe("low");
  });

  it("correctly identifies medium severity", () => {
    const content = `[SYMPTOM_ANALYSIS]{"symptoms":["دوخة","إرهاق"],"possibleCauses":["نقص حديد"],"severity":"medium","recommendations":[]}[/SYMPTOM_ANALYSIS]`;
    const analysis = parseSymptomAnalysis(content);
    expect(analysis!.severity).toBe("medium");
  });

  it("correctly identifies high severity requiring doctor", () => {
    const content = `[SYMPTOM_ANALYSIS]{"symptoms":["ألم صدر","ضيق تنفس"],"possibleCauses":["مشكلة قلبية محتملة"],"severity":"high","recommendations":[]}[/SYMPTOM_ANALYSIS]
[REFER_DOCTOR]`;
    const analysis = parseSymptomAnalysis(content);
    expect(analysis!.severity).toBe("high");
    expect(isReferDoctor(content)).toBe(true);
  });
});

describe("Symptom Analyzer: REFER_DOCTOR detection", () => {
  it("detects REFER_DOCTOR marker", () => {
    const content = "الأعراض خطيرة. [REFER_DOCTOR]";
    expect(isReferDoctor(content)).toBe(true);
  });

  it("returns false when REFER_DOCTOR not present", () => {
    const content = "أعراض خفيفة يمكن معالجتها بالمكملات.";
    expect(isReferDoctor(content)).toBe(false);
  });
});

describe("Symptom Analyzer: content cleaning", () => {
  it("removes SYMPTOM_ANALYSIS block from displayed content", () => {
    const content = `بناءً على أعراضك:
[SYMPTOM_ANALYSIS]{"symptoms":["دوخة"],"severity":"low","recommendations":[]}[/SYMPTOM_ANALYSIS]
أنصحك بأخذ مكملات الحديد.`;

    const cleaned = cleanContent(content);
    expect(cleaned).not.toContain("[SYMPTOM_ANALYSIS]");
    expect(cleaned).not.toContain("[/SYMPTOM_ANALYSIS]");
    expect(cleaned).toContain("أنصحك بأخذ مكملات الحديد");
  });

  it("removes REFER_DOCTOR marker from displayed content", () => {
    const content = "يرجى مراجعة طبيب. [REFER_DOCTOR]";
    const cleaned = cleanContent(content);
    expect(cleaned).not.toContain("[REFER_DOCTOR]");
    expect(cleaned).toContain("يرجى مراجعة طبيب");
  });
});

describe("Symptom Analyzer: product matching by symptoms", () => {
  it("matches iron product for dizziness/fatigue symptoms", () => {
    const matched = matchProductsByKeywords(["حديد", "فقر الدم"], ["المناعة"]);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.some(p => p.name.includes("حديد"))).toBe(true);
  });

  it("matches B12 for energy/fatigue symptoms", () => {
    const matched = matchProductsByKeywords(["B12", "طاقة"], []);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.some(p => p.name.includes("B12"))).toBe(true);
  });

  it("matches vitamin D for joint pain symptoms", () => {
    const matched = matchProductsByKeywords(["فيتامين D"], ["المفاصل"]);
    expect(matched.length).toBeGreaterThan(0);
  });

  it("matches magnesium for headache/heart palpitation symptoms", () => {
    const matched = matchProductsByKeywords(["مغنيسيوم"], ["الضغط"]);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.some(p => p.name.includes("مغنيسيوم"))).toBe(true);
  });

  it("returns empty array when no symptom match found", () => {
    const matched = matchProductsByKeywords(["شيء غير موجود"], ["مرض غير موجود"]);
    expect(matched).toHaveLength(0);
  });
});

describe("Symptom Analyzer: deduplication", () => {
  it("deduplicates products when multiple symptoms match same product", () => {
    const matched1 = matchProductsByKeywords(["مغنيسيوم"], ["الضغط"]);
    const matched2 = matchProductsByKeywords(["مغنيسيوم", "ضغط"], ["الضغط"]);
    // Both should return the same product without duplicates
    const ids1 = matched1.map(p => p.id);
    const ids2 = matched2.map(p => p.id);
    expect(ids1.length).toBe(new Set(ids1).size);
    expect(ids2.length).toBe(new Set(ids2).size);
  });
});

describe("Symptom Analyzer: symptom collection tracking", () => {
  it("correctly deduplicates collected symptoms", () => {
    const existing = ["دوخة", "إرهاق"];
    const newFromAnalysis = ["دوخة", "صداع"]; // "دوخة" is duplicate
    const combined = [...existing, ...newFromAnalysis];
    const deduped = combined.filter((v, i) => combined.indexOf(v) === i);
    expect(deduped).toHaveLength(3);
    expect(deduped).toContain("دوخة");
    expect(deduped).toContain("إرهاق");
    expect(deduped).toContain("صداع");
  });

  it("preserves order when deduplicating symptoms", () => {
    const symptoms = ["إرهاق", "دوخة", "إرهاق", "صداع"];
    const deduped = symptoms.filter((v, i) => symptoms.indexOf(v) === i);
    expect(deduped[0]).toBe("إرهاق");
    expect(deduped[1]).toBe("دوخة");
    expect(deduped[2]).toBe("صداع");
  });
});
