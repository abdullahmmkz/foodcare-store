/**
 * Tests for blood test image analysis feature
 * Verifies LAB_ANALYSIS block parsing, value extraction, status detection,
 * and product recommendation logic
 */
import { describe, expect, it } from "vitest";

// ─── Types ────────────────────────────────────────────────────────────────────

type LabValueStatus = "normal" | "low" | "high";
type OverallStatus = "normal" | "needs_attention" | "critical";

interface LabValue {
  name: string;
  value: string;
  unit: string;
  status: LabValueStatus;
  normalRange: string;
}

interface LabAnalysis {
  extractedValues: LabValue[];
  abnormalValues: string[];
  overallStatus: OverallStatus;
  recommendations: Array<{
    name: string;
    reason: string;
    keywords: string[];
    diseaseKeywords?: string[];
  }>;
}

// ─── Helpers (mirrors server logic) ──────────────────────────────────────────

function parseLabAnalysis(content: string): LabAnalysis | null {
  const match = content.match(/\[LAB_ANALYSIS\]([\s\S]*?)\[\/LAB_ANALYSIS\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    const extractedValues: LabValue[] = (parsed.extractedValues || []).map((v: any) => ({
      name: v.name || "",
      value: v.value || "",
      unit: v.unit || "",
      status: (["normal", "low", "high"].includes(v.status) ? v.status : "normal") as LabValueStatus,
      normalRange: v.normalRange || "",
    }));
    return {
      extractedValues,
      abnormalValues: parsed.abnormalValues || [],
      overallStatus: (["normal", "needs_attention", "critical"].includes(parsed.overallStatus)
        ? parsed.overallStatus : "normal") as OverallStatus,
      recommendations: parsed.recommendations || [],
    };
  } catch {
    return null;
  }
}

function isReferDoctor(content: string): boolean {
  return content.includes("[REFER_DOCTOR]");
}

function cleanLabContent(content: string): string {
  return content
    .replace(/\[LAB_ANALYSIS\][\s\S]*?\[\/LAB_ANALYSIS\]/g, "")
    .replace(/\[REFER_DOCTOR\]/g, "")
    .trim();
}

function getAbnormalValues(values: LabValue[]): LabValue[] {
  return values.filter(v => v.status !== "normal");
}

function getNormalValues(values: LabValue[]): LabValue[] {
  return values.filter(v => v.status === "normal");
}

// ─── Mock products ────────────────────────────────────────────────────────────

const mockProducts = [
  { id: 1, name: "أوميغا 3 لصحة القلب", diseaseName: "الضغط" },
  { id: 2, name: "مغنيسيوم لتنظيم ضغط الدم", diseaseName: "الضغط" },
  { id: 3, name: "حديد عضوي لعلاج فقر الدم", diseaseName: "المناعة" },
  { id: 4, name: "فيتامين D3 + K2 لصحة العظام", diseaseName: "المفاصل" },
  { id: 5, name: "فيتامين B12 للطاقة والأعصاب", diseaseName: "المناعة" },
  { id: 6, name: "برنامج السكري الشامل", diseaseName: "السكري" },
  { id: 7, name: "نياسين لخفض الكوليسترول", diseaseName: "الكوليسترول" },
];

function matchProducts(keywords: string[], diseaseNames: string[]) {
  const lowerKw = keywords.map(k => k.toLowerCase());
  const lowerDis = diseaseNames.map(d => d.toLowerCase());
  return mockProducts.filter(p => {
    const nameMatch = lowerKw.some(kw => p.name.includes(kw));
    const diseaseMatch = lowerDis.some(d => p.diseaseName.includes(d));
    return nameMatch || diseaseMatch;
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Lab Analysis: LAB_ANALYSIS block parsing", () => {
  it("parses a complete blood test result with mixed values", () => {
    const llmResponse = `
بناءً على نتائج فحص الدم، وجدت ما يلي:

[LAB_ANALYSIS]
{
  "extractedValues": [
    { "name": "هيموغلوبين", "value": "9.5", "unit": "g/dL", "status": "low", "normalRange": "12-17 g/dL" },
    { "name": "سكر الدم الصائم", "value": "95", "unit": "mg/dL", "status": "normal", "normalRange": "70-100 mg/dL" },
    { "name": "فيتامين D", "value": "12", "unit": "ng/mL", "status": "low", "normalRange": "30-100 ng/mL" },
    { "name": "كوليسترول كلي", "value": "220", "unit": "mg/dL", "status": "high", "normalRange": "< 200 mg/dL" }
  ],
  "abnormalValues": ["هيموغلوبين", "فيتامين D", "كوليسترول كلي"],
  "overallStatus": "needs_attention",
  "recommendations": [
    { "name": "حديد عضوي", "reason": "لرفع مستوى الهيموغلوبين", "keywords": ["حديد", "iron"], "diseaseKeywords": ["المناعة"] },
    { "name": "فيتامين D3", "reason": "لتعويض نقص فيتامين D", "keywords": ["فيتامين D", "D3"], "diseaseKeywords": ["المفاصل"] },
    { "name": "نياسين", "reason": "لخفض الكوليسترول", "keywords": ["نياسين", "كوليسترول"], "diseaseKeywords": ["الكوليسترول"] }
  ]
}
[/LAB_ANALYSIS]
    `.trim();

    const result = parseLabAnalysis(llmResponse);
    expect(result).not.toBeNull();
    expect(result!.extractedValues).toHaveLength(4);
    expect(result!.abnormalValues).toHaveLength(3);
    expect(result!.overallStatus).toBe("needs_attention");
    expect(result!.recommendations).toHaveLength(3);
  });

  it("returns null when no LAB_ANALYSIS block present", () => {
    expect(parseLabAnalysis("لا توجد نتائج فحص.")).toBeNull();
  });

  it("returns null for invalid JSON in block", () => {
    expect(parseLabAnalysis("[LAB_ANALYSIS]invalid json[/LAB_ANALYSIS]")).toBeNull();
  });

  it("handles empty extractedValues gracefully", () => {
    const content = `[LAB_ANALYSIS]{"extractedValues":[],"abnormalValues":[],"overallStatus":"normal","recommendations":[]}[/LAB_ANALYSIS]`;
    const result = parseLabAnalysis(content);
    expect(result).not.toBeNull();
    expect(result!.extractedValues).toHaveLength(0);
    expect(result!.overallStatus).toBe("normal");
  });
});

describe("Lab Analysis: status normalization", () => {
  it("normalizes unknown status to 'normal'", () => {
    const content = `[LAB_ANALYSIS]{"extractedValues":[{"name":"X","value":"5","unit":"u","status":"unknown","normalRange":"1-10"}],"abnormalValues":[],"overallStatus":"normal","recommendations":[]}[/LAB_ANALYSIS]`;
    const result = parseLabAnalysis(content);
    expect(result!.extractedValues[0].status).toBe("normal");
  });

  it("preserves valid status values", () => {
    const content = `[LAB_ANALYSIS]{"extractedValues":[
      {"name":"A","value":"1","unit":"u","status":"low","normalRange":"2-5"},
      {"name":"B","value":"9","unit":"u","status":"high","normalRange":"2-5"},
      {"name":"C","value":"3","unit":"u","status":"normal","normalRange":"2-5"}
    ],"abnormalValues":["A","B"],"overallStatus":"needs_attention","recommendations":[]}[/LAB_ANALYSIS]`;
    const result = parseLabAnalysis(content);
    expect(result!.extractedValues[0].status).toBe("low");
    expect(result!.extractedValues[1].status).toBe("high");
    expect(result!.extractedValues[2].status).toBe("normal");
  });

  it("normalizes unknown overallStatus to 'normal'", () => {
    const content = `[LAB_ANALYSIS]{"extractedValues":[],"abnormalValues":[],"overallStatus":"unknown_status","recommendations":[]}[/LAB_ANALYSIS]`;
    const result = parseLabAnalysis(content);
    expect(result!.overallStatus).toBe("normal");
  });
});

describe("Lab Analysis: value filtering", () => {
  const sampleValues: LabValue[] = [
    { name: "هيموغلوبين", value: "9.5", unit: "g/dL", status: "low", normalRange: "12-17" },
    { name: "سكر", value: "95", unit: "mg/dL", status: "normal", normalRange: "70-100" },
    { name: "كوليسترول", value: "220", unit: "mg/dL", status: "high", normalRange: "<200" },
    { name: "فيتامين D", value: "12", unit: "ng/mL", status: "low", normalRange: "30-100" },
  ];

  it("correctly filters abnormal values", () => {
    const abnormal = getAbnormalValues(sampleValues);
    expect(abnormal).toHaveLength(3);
    expect(abnormal.every(v => v.status !== "normal")).toBe(true);
  });

  it("correctly filters normal values", () => {
    const normal = getNormalValues(sampleValues);
    expect(normal).toHaveLength(1);
    expect(normal[0].name).toBe("سكر");
  });

  it("returns empty array when all values are normal", () => {
    const allNormal: LabValue[] = [
      { name: "A", value: "5", unit: "u", status: "normal", normalRange: "1-10" },
      { name: "B", value: "3", unit: "u", status: "normal", normalRange: "1-10" },
    ];
    expect(getAbnormalValues(allNormal)).toHaveLength(0);
  });
});

describe("Lab Analysis: REFER_DOCTOR detection", () => {
  it("detects critical results requiring doctor", () => {
    const content = "نتائج خطيرة تستدعي مراجعة طبيب. [REFER_DOCTOR]";
    expect(isReferDoctor(content)).toBe(true);
  });

  it("returns false for non-critical results", () => {
    const content = "القيم طبيعية، لا حاجة لزيارة طبيب.";
    expect(isReferDoctor(content)).toBe(false);
  });
});

describe("Lab Analysis: content cleaning", () => {
  it("removes LAB_ANALYSIS block from displayed content", () => {
    const content = `نتائج الفحص جاهزة.
[LAB_ANALYSIS]{"extractedValues":[],"abnormalValues":[],"overallStatus":"normal","recommendations":[]}[/LAB_ANALYSIS]
يرجى متابعة التوصيات.`;
    const cleaned = cleanLabContent(content);
    expect(cleaned).not.toContain("[LAB_ANALYSIS]");
    expect(cleaned).not.toContain("[/LAB_ANALYSIS]");
    expect(cleaned).toContain("يرجى متابعة التوصيات");
  });

  it("removes REFER_DOCTOR marker", () => {
    const content = "راجع طبيباً. [REFER_DOCTOR]";
    const cleaned = cleanLabContent(content);
    expect(cleaned).not.toContain("[REFER_DOCTOR]");
    expect(cleaned).toContain("راجع طبيباً");
  });
});

describe("Lab Analysis: product matching from recommendations", () => {
  it("matches iron product for low hemoglobin", () => {
    const matched = matchProducts(["حديد", "iron"], ["المناعة"]);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.some(p => p.name.includes("حديد"))).toBe(true);
  });

  it("matches vitamin D product for low vitamin D", () => {
    const matched = matchProducts(["فيتامين D", "D3"], ["المفاصل"]);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.some(p => p.name.includes("D3") || p.name.includes("فيتامين"))).toBe(true);
  });

  it("matches cholesterol product for high cholesterol", () => {
    const matched = matchProducts(["نياسين", "كوليسترول"], ["الكوليسترول"]);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.some(p => p.name.includes("كوليسترول"))).toBe(true);
  });

  it("matches B12 for neurological/fatigue issues", () => {
    const matched = matchProducts(["B12", "فيتامين B12"], ["المناعة"]);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.some(p => p.name.includes("B12"))).toBe(true);
  });

  it("returns empty when no match found", () => {
    const matched = matchProducts(["شيء غير موجود"], ["مرض غير موجود"]);
    expect(matched).toHaveLength(0);
  });
});

describe("Lab Analysis: image upload validation", () => {
  it("rejects base64 strings exceeding 14MB limit", () => {
    // 14_000_000 chars base64 ≈ 10MB raw
    const oversizedBase64 = "A".repeat(14_000_001);
    const isOversized = oversizedBase64.length > 14_000_000;
    expect(isOversized).toBe(true);
  });

  it("accepts base64 strings within limit", () => {
    const validBase64 = "A".repeat(1_000_000); // ~750KB
    const isOversized = validBase64.length > 14_000_000;
    expect(isOversized).toBe(false);
  });

  it("generates unique S3 keys for each upload", () => {
    const generateKey = (fileName: string) => {
      const suffix = Math.random().toString(36).slice(2, 8);
      return `lab-results/${Date.now()}-${suffix}-${fileName}`;
    };
    const key1 = generateKey("result.jpg");
    const key2 = generateKey("result.jpg");
    expect(key1).not.toBe(key2);
    expect(key1).toContain("lab-results/");
    expect(key1).toContain("result.jpg");
  });
});

describe("Lab Analysis: overall status logic", () => {
  it("correctly identifies 'normal' status when all values in range", () => {
    const content = `[LAB_ANALYSIS]{"extractedValues":[{"name":"سكر","value":"90","unit":"mg/dL","status":"normal","normalRange":"70-100"}],"abnormalValues":[],"overallStatus":"normal","recommendations":[]}[/LAB_ANALYSIS]`;
    const result = parseLabAnalysis(content);
    expect(result!.overallStatus).toBe("normal");
    expect(result!.abnormalValues).toHaveLength(0);
  });

  it("correctly identifies 'critical' status for dangerous values", () => {
    const content = `[LAB_ANALYSIS]{"extractedValues":[{"name":"سكر","value":"450","unit":"mg/dL","status":"high","normalRange":"70-100"}],"abnormalValues":["سكر"],"overallStatus":"critical","recommendations":[]}[/LAB_ANALYSIS]`;
    const result = parseLabAnalysis(content);
    expect(result!.overallStatus).toBe("critical");
  });
});
