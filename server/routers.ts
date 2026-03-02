import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAllDiseases, getDiseaseById, createDisease, updateDisease, deleteDisease,
  getProducts, getProductById, getRelatedProducts,
  createProduct, updateProduct, deleteProduct, incrementProductClicks,
  getAllProductsAdmin,
  createLocalUser, getLocalUserByEmail, getLocalUserById,
  getHealthProfile, upsertHealthProfile,
  getProductsByKeywords,
} from "./db";
import { invokeLLM } from "./_core/llm";

const LOCAL_COOKIE = "fc_local_session";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

async function signLocalToken(userId: number, role: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "local-secret-key");
  return new SignJWT({ sub: String(userId), role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(LOCAL_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Local Auth (Email/Password) ─────────────────────────────────────────
  localAuth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      const token = ctx.req.cookies?.[LOCAL_COOKIE];
      if (!token) return null;
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "local-secret-key");
        const { payload } = await jwtVerify(token, secret);
        const userId = Number(payload.sub);
        const user = await getLocalUserById(userId);
        if (!user) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      } catch {
        return null;
      }
    }),

    register: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getLocalUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
        const passwordHash = await bcrypt.hash(input.password, 12);
        const userId = await createLocalUser({ name: input.name, email: input.email, passwordHash });
        const token = await signLocalToken(userId, "user");
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(LOCAL_COOKIE, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true, name: input.name, email: input.email, role: "user" };
      }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const user = await getLocalUserByEmail(input.email);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        const token = await signLocalToken(user.id, user.role);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(LOCAL_COOKIE, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true, name: user.name, email: user.email, role: user.role };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(LOCAL_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
  }),

  // ─── Diseases ─────────────────────────────────────────────────────────────
  diseases: router({
    list: publicProcedure.query(async () => getAllDiseases()),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1), nameAr: z.string().min(1), icon: z.string().optional() }))
      .mutation(async ({ input }) => { await createDisease(input); return { success: true }; }),

    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), nameAr: z.string().optional(), icon: z.string().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await updateDisease(id, data); return { success: true }; }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteDisease(input.id); return { success: true }; }),
  }),

  // ─── Products ─────────────────────────────────────────────────────────────
  products: router({
    list: publicProcedure
      .input(z.object({
        diseaseId: z.number().optional(),
        search: z.string().optional(),
        sort: z.enum(["newest", "popular", "cheapest"]).optional(),
        limit: z.number().min(1).max(50).default(12),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => getProducts(input)),

    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const product = await getProductById(input.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });
        return product;
      }),

    related: publicProcedure
      .input(z.object({ diseaseId: z.number(), excludeId: z.number(), limit: z.number().default(4) }))
      .query(async ({ input }) => getRelatedProducts(input.diseaseId, input.excludeId, input.limit)),

    trackClick: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await incrementProductClicks(input.id); return { success: true }; }),

    adminList: adminProcedure.query(async () => getAllProductsAdmin()),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1), image: z.string().url(), link: z.string().url(),
        diseaseId: z.number(), price: z.string().optional(), featured: z.number().optional(),
      }))
      .mutation(async ({ input }) => { await createProduct({ ...input, clicks: 0 }); return { success: true }; }),

    update: adminProcedure
      .input(z.object({
        id: z.number(), name: z.string().optional(), image: z.string().url().optional(),
        link: z.string().url().optional(), diseaseId: z.number().optional(),
        price: z.string().optional(), featured: z.number().optional(),
      }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await updateProduct(id, data); return { success: true }; }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteProduct(input.id); return { success: true }; }),
  }),

  // ─── Health Profile ───────────────────────────────────────────────────────
  healthProfile: router({
    get: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => getHealthProfile(input.userId)),

    save: publicProcedure
      .input(z.object({
        userId: z.number(),
        age: z.number().min(1).max(120).optional(),
        weight: z.number().min(20).max(300).optional(),
        height: z.number().min(100).max(250).optional(),
        gender: z.enum(["male", "female"]).optional(),
        diseases: z.string().optional(),
        goal: z.enum(["weight_loss", "blood_sugar", "blood_pressure", "cholesterol", "general_health"]).optional(),
        activityLevel: z.enum(["sedentary", "light", "moderate", "active"]).optional(),
        allergies: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { userId, ...data } = input;
        await upsertHealthProfile(userId, data);
        return { success: true };
      }),
  }),

  // ─── ChatBot: Symptom Analyzer ────────────────────────────────────────────
  chatbot: router({
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })),
        // Collected symptoms so far (frontend tracks them)
        collectedSymptoms: z.array(z.string()).default([]),
        // Health profile from DB
        healthProfile: z.object({
          age: z.number().nullable().optional(),
          weight: z.number().nullable().optional(),
          height: z.number().nullable().optional(),
          gender: z.string().nullable().optional(),
          diseases: z.string().nullable().optional(),
          goal: z.string().nullable().optional(),
          activityLevel: z.string().nullable().optional(),
          allergies: z.string().nullable().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        // Fetch store products for recommendation context
        const storeProducts = await getProducts({ limit: 100, offset: 0 });
        const productsContext = storeProducts.items.map((p: any) => ({
          id: p.id,
          name: p.name,
          disease: p.diseaseName,
          price: p.price,
        }));

        // Build health profile context
        let healthCtx = "";
        let userDiseases: string[] = [];
        if (input.healthProfile) {
          const hp = input.healthProfile;
          try { userDiseases = hp.diseases ? JSON.parse(hp.diseases) : []; } catch { userDiseases = []; }
          const genderLabel = hp.gender === "male" ? "ذكر" : hp.gender === "female" ? "أنثى" : "غير محدد";
          const goalMap: Record<string, string> = {
            weight_loss: "خسارة الوزن", blood_sugar: "تنظيم السكر",
            blood_pressure: "تنظيم الضغط", cholesterol: "تحسين الكوليسترول", general_health: "صحة عامة",
          };
          healthCtx = `
[معلومات المستخدم المسجّلة — لا تسأل عنها مجدداً]
العمر: ${hp.age ?? "غير محدد"} سنة | الجنس: ${genderLabel} | الوزن: ${hp.weight ?? "غير محدد"} كج | الطول: ${hp.height ?? "غير محدد"} سم
الأمراض المعروفة: ${userDiseases.length > 0 ? userDiseases.join("، ") : "لا يوجد"}
الهدف: ${hp.goal ? (goalMap[hp.goal] ?? hp.goal) : "غير محدد"}
${hp.allergies ? `الحساسية: ${hp.allergies}` : ""}
`;
        }

        const symptomsCtx = input.collectedSymptoms.length > 0
          ? `\n[الأعراض المُجمَّعة حتى الآن: ${input.collectedSymptoms.join("، ")}]\n`
          : "";

        // ── SYSTEM PROMPT: Symptom Analyzer ──────────────────────────────────
        const systemPrompt = `أنت "د. فود" — محلل أعراض ذكي لموقع FoodCure، متجر صحي متخصص في المكملات الغذائية والمنتجات الصحية الطبيعية.

دورك الأساسي:
أنت لست طبيباً ولا تُشخِّص الأمراض. أنت تستمع للأعراض التي يصفها المستخدم، تحلّلها، تحدد السبب الغذائي أو النقص الغذائي المحتمل، ثم ترشّح منتجات من متجر FoodCure قد تساعد.
${healthCtx}
${symptomsCtx}
منهجية المحادثة:
1. **استقبال الأعراض**: اسأل المستخدم عن أعراضه بشكل طبيعي ومتعاطف. اسأل سؤالاً واحداً في كل مرة.
2. **التعمق**: إذا ذكر عرضاً واحداً، اسأل عن تفاصيل (متى بدأ؟ مستمر أم متقطع؟ مصحوب بأعراض أخرى؟)
3. **التحليل**: بعد جمع 2-3 أعراض، حلّل السبب الغذائي المحتمل (نقص فيتامين، نقص معدن، جفاف، إجهاد...)
4. **الترشيح**: رشّح منتجات من المتجر مناسبة للحالة

أمثلة على ربط الأعراض بالأسباب الغذائية:
- دوخة + إرهاق → نقص حديد / نقص فيتامين B12 / انخفاض ضغط
- تعب مستمر + خمول → نقص فيتامين D / نقص مغنيسيوم / قصور درقي
- صداع متكرر → جفاف / نقص مغنيسيوم / ارتفاع ضغط
- ضعف تركيز + نسيان → نقص أوميغا 3 / نقص B12 / قلة نوم
- ألم مفاصل → نقص كالسيوم / نقص فيتامين D / التهاب
- مشاكل هضم → نقص بروبيوتيك / حساسية غذائية
- شعر وأظافر هشة → نقص بيوتين / نقص زنك / نقص بروتين
- كثرة التبول + عطش → ارتفاع سكر / جفاف
- خفقان قلب → نقص مغنيسيوم / نقص بوتاسيوم / قلق

قواعد صارمة:
- لا تُشخِّص أمراضاً ولا تصف أدوية أبداً
- إذا كانت الأعراض خطيرة (ألم صدر، ضيق تنفس، إغماء) → أحِل فوراً لطبيب
- اذكر دائماً أن توصياتك تكميلية وليست بديلاً طبياً
- كن دافئاً ومتعاطفاً وواضحاً
- اكتب بالعربية دائماً

منتجات المتجر المتاحة:
${JSON.stringify(productsContext, null, 2)}

عندما تكون جاهزاً لترشيح المنتجات (بعد تحليل الأعراض)، أضف هذا الكتلة في نهاية ردك:

[SYMPTOM_ANALYSIS]
{
  "symptoms": ["عرض1", "عرض2"],
  "possibleCauses": ["السبب المحتمل 1", "السبب المحتمل 2"],
  "severity": "low|medium|high",
  "recommendations": [
    {
      "name": "اسم المكمل أو المنتج",
      "reason": "لماذا هذا المنتج مناسب لهذه الأعراض",
      "keywords": ["كلمة مفتاحية1", "كلمة2"],
      "diseaseKeywords": ["مرض مرتبط"]
    }
  ]
}
[/SYMPTOM_ANALYSIS]

- severity: low = أعراض خفيفة، medium = تحتاج متابعة، high = راجع طبيباً فوراً
- أضف [REFER_DOCTOR] إذا كانت الأعراض تستدعي زيارة طبيب عاجلة`;

        const llmMessages = [
          { role: "system" as const, content: systemPrompt },
          ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ];

        const response = await invokeLLM({ messages: llmMessages });
        const rawContent = response.choices[0]?.message?.content || "عذراً، حدث خطأ. حاول مرة أخرى.";
        const content = typeof rawContent === "string" ? rawContent : "عذراً، حدث خطأ. حاول مرة أخرى.";

        // ── Parse SYMPTOM_ANALYSIS block ──────────────────────────────────────
        let recommendedProducts: any[] = [];
        let analysisData: {
          symptoms: string[];
          possibleCauses: string[];
          severity: "low" | "medium" | "high";
        } | null = null;

        const analysisMatch = content.match(/\[SYMPTOM_ANALYSIS\]([\s\S]*?)\[\/SYMPTOM_ANALYSIS\]/);
        if (analysisMatch) {
          try {
            const parsed = JSON.parse(analysisMatch[1].trim());
            analysisData = {
              symptoms: parsed.symptoms || [],
              possibleCauses: parsed.possibleCauses || [],
              severity: parsed.severity || "low",
            };

            const recommendations: Array<{
              name: string; reason: string; keywords: string[]; diseaseKeywords?: string[];
            }> = parsed.recommendations || [];

            const seen = new Set<number>();
            for (const rec of recommendations.slice(0, 6)) {
              const keywords = [rec.name, ...(rec.keywords || [])].filter(Boolean);
              const diseaseKws = rec.diseaseKeywords || userDiseases;
              const matched = await getProductsByKeywords(keywords, diseaseKws, 2);
              for (const p of matched) {
                if (!seen.has(p.id)) {
                  seen.add(p.id);
                  recommendedProducts.push({
                    ...p,
                    reason: rec.reason || "موصى به لأعراضك",
                    supplement: rec.name,
                  });
                }
              }
            }
          } catch { /* ignore parse errors */ }
        }

        // Fallback: if analysis found but no products matched, search by diseases
        if (analysisData && recommendedProducts.length === 0 && userDiseases.length > 0) {
          const fallback = await getProductsByKeywords([], userDiseases, 4);
          recommendedProducts = fallback.map(p => ({
            ...p,
            reason: "مناسب لحالتك الصحية",
          }));
        }

        const referDoctor = content.includes("[REFER_DOCTOR]");

        // Clean content
        const cleanContent = content
          .replace(/\[SYMPTOM_ANALYSIS\][\s\S]*?\[\/SYMPTOM_ANALYSIS\]/g, "")
          .replace(/\[REFER_DOCTOR\]/g, "")
          .trim();

        return {
          message: cleanContent,
          recommendedProducts,
          analysisData,
          referDoctor,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
