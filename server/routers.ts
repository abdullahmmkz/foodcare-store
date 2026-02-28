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
import axios from "axios";

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
    // Get current local session user
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
        name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
        email: z.string().email("البريد الإلكتروني غير صحيح"),
        password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getLocalUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        const userId = await createLocalUser({ name: input.name, email: input.email, passwordHash });
        const token = await signLocalToken(userId, "user");
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(LOCAL_COOKIE, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true, name: input.name, email: input.email, role: "user" };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email("البريد الإلكتروني غير صحيح"),
        password: z.string().min(1, "كلمة المرور مطلوبة"),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getLocalUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        }
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

  // ─── Diseases (public read, admin write) ──────────────────────────────────
  diseases: router({
    list: publicProcedure.query(async () => {
      return getAllDiseases();
    }),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1), nameAr: z.string().min(1), icon: z.string().optional() }))
      .mutation(async ({ input }) => {
        await createDisease(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).optional(), nameAr: z.string().min(1).optional(), icon: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateDisease(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDisease(input.id);
        return { success: true };
      }),
  }),

  // ─── Products (public read, admin write) ──────────────────────────────────
  products: router({
    list: publicProcedure
      .input(z.object({
        diseaseId: z.number().optional(),
        search: z.string().optional(),
        sort: z.enum(["newest", "popular", "cheapest"]).optional(),
        limit: z.number().min(1).max(50).default(12),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return getProducts(input);
      }),

    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const product = await getProductById(input.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });
        return product;
      }),

    related: publicProcedure
      .input(z.object({ diseaseId: z.number(), excludeId: z.number(), limit: z.number().default(4) }))
      .query(async ({ input }) => {
        return getRelatedProducts(input.diseaseId, input.excludeId, input.limit);
      }),

    trackClick: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await incrementProductClicks(input.id);
        return { success: true };
      }),

    adminList: adminProcedure.query(async () => {
      return getAllProductsAdmin();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        image: z.string().url(),
        link: z.string().url(),
        diseaseId: z.number(),
        price: z.string().optional(),
        featured: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await createProduct({ ...input, clicks: 0 });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        image: z.string().url().optional(),
        link: z.string().url().optional(),
        diseaseId: z.number().optional(),
        price: z.string().optional(),
        featured: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateProduct(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProduct(input.id);
        return { success: true };
      }),
  }),

  // ─── Health Profile ──────────────────────────────────────────────────────────
  healthProfile: router({
    get: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getHealthProfile(input.userId);
      }),

    save: publicProcedure
      .input(z.object({
        userId: z.number(),
        age: z.number().min(1).max(120).optional(),
        weight: z.number().min(20).max(300).optional(),
        height: z.number().min(100).max(250).optional(),
        gender: z.enum(["male", "female"]).optional(),
        diseases: z.string().optional(), // JSON array
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

  // ─── ChatBot ─────────────────────────────────────────────────────────────
  chatbot: router({
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })),
        step: z.enum(["greeting", "condition", "details", "plan", "products"]).default("greeting"),
        condition: z.string().optional(),
        age: z.string().optional(),
        weight: z.string().optional(),
        goal: z.string().optional(),
        // Health profile from DB (pre-filled)
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
        // Fetch all products from the store to use as context
        const storeProducts = await getProducts({ limit: 100, offset: 0 });
        const productsContext = storeProducts.items.map((p: any) => ({
          id: p.id,
          name: p.name,
          disease: p.diseaseName,
          link: p.link,
          image: p.image,
          price: p.price,
        }));

        // Fetch nutrition data from Open Food Facts if we have a condition
        let nutritionContext = "";
        if (input.condition) {
          try {
            const searchTerm = input.condition === "سكري" ? "diabetic" :
              input.condition === "ضغط" ? "low sodium" :
              input.condition === "كوليسترول" ? "cholesterol" :
              input.condition === "سمنة" ? "low calorie" : "healthy";
            const offRes = await axios.get(
              `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${searchTerm}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments,categories_tags`,
              { timeout: 5000 }
            );
            if (offRes.data?.products?.length > 0) {
              const foods = offRes.data.products
                .filter((p: any) => p.product_name)
                .slice(0, 5)
                .map((p: any) => p.product_name)
                .join("، ");
              nutritionContext = `\nأمثلة أطعمة مناسبة من قاعدة بيانات Open Food Facts: ${foods}`;
            }
          } catch (e) {
            // Ignore API errors, continue without nutrition data
          }
        }

        // Build health profile context if available
        let healthProfileContext = "";
        let userDiseases: string[] = [];
        if (input.healthProfile) {
          const hp = input.healthProfile;
          try { userDiseases = hp.diseases ? JSON.parse(hp.diseases) : []; } catch { userDiseases = []; }
          healthProfileContext = `
معلومات المستخدم (مسجّلة مسبقاً لا تسأل عنها مرة أخرى):
- العمر: ${hp.age || "غير محدد"} سنة
- الوزن: ${hp.weight || "غير محدد"} كج
- الطول: ${hp.height || "غير محدد"} سم
- الجنس: ${hp.gender === "male" ? "ذكر" : hp.gender === "female" ? "أنثى" : "غير محدد"}
- الأمراض: ${userDiseases.length > 0 ? userDiseases.join("، ") : "لا يوجد"}
- الهدف: ${hp.goal === "weight_loss" ? "خسارة الوزن" : hp.goal === "blood_sugar" ? "تنظيم السكر" : hp.goal === "blood_pressure" ? "تنظيم الضغط" : hp.goal === "cholesterol" ? "تحسين الكوليسترول" : "صحة عامة"}
- مستوى النشاط: ${hp.activityLevel === "sedentary" ? "خامل" : hp.activityLevel === "light" ? "خفيف" : hp.activityLevel === "moderate" ? "متوسط" : "نشيط"}
${hp.allergies ? `- حساسية: ${hp.allergies}` : ""}
`;
        }

        const systemPrompt = `أنت مساعد تغذية ذكي لموقع FoodCure، متجر صحي يبيع مكملات غذائية ومنتجات صحية.

هدفك الأساسي:
1. صناعة نظام غذائي يومي مخصص للمستخدم بناءً على حالته الصحية
2. ترشيح مكملات غذائية ومنتجات مناسبة من متجر FoodCure مرتبطة بمكونات الخطة
${healthProfileContext}
المحادثة موجّهة بهذه الخطوات:
${input.healthProfile ? `- لديك بيانات المستخدم مسبقاً. ابدأ مباشرة بتصميم النظام الغذائي دون أسئلة متكررة` : `- الخطوة 1 (greeting): رحّب وابدأ باسأل عن الحالة الصحية
- الخطوة 2 (condition): بعد معرفة الحالة، اسأل عن العمر والوزن التقريبي والهدف
- الخطوة 3 (details): بعد التفاصيل، اصنع نظام غذائي يومي كامل (فطور-غداء-عشاء-سناك)`}
- الخطوة الأخيرة: رشّح مكملات غذائية من المتجر مرتبطة بالخطة

منتجات المتجر المتاحة (استخدمها لترشيح المنتجات):
${JSON.stringify(productsContext, null, 2)}
${nutritionContext}

قواعد مهمة:
- لا تقدم تشخيصاً طبياً أو أدوية
- قدم توصيات غذائية عامة فقط
- كن ودّياً وبسيطاً ومختصراً
- عند تصميم النظام الغذائي، حدّد المكملات الغذائية المطلوبة

عند الانتهاء من تصميم النظام الغذائي الكامل، أضف قسم المنتجات بهذا التنسيق الدقيق:

[MEAL_PRODUCTS]
{
  "supplements": [
    {
      "name": "اسم المكمل أو المنتج الموصى به",
      "reason": "سبب التوصية المرتبط بالخطة الغذائية",
      "keywords": ["كلمة1", "كلمة2"],
      "diseaseKeywords": ["سكري", "ضغط"]
    }
  ]
}
[/MEAL_PRODUCTS]

- أضف [PDF_READY] في نهاية الرد الذي يحتوي على النظام الغذائي الكامل
- في نهاية كل رد يتضمن توصيات: أضف "⚠️ هذه التوصيات عامة وليست بديلاً عن استشارة الطبيب"
- اكتب بالعربية دائماً`;

        const llmMessages = [
          { role: "system" as const, content: systemPrompt },
          ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ];

        const response = await invokeLLM({ messages: llmMessages });
        const rawContent = response.choices[0]?.message?.content || "عذراً، حدث خطأ. حاول مرة أخرى.";
        const content = typeof rawContent === "string" ? rawContent : "عذراً، حدث خطأ. حاول مرة أخرى.";

        // ─── Extract meal-linked product recommendations ───────────────────────
        let recommendedProducts: any[] = [];

        // Try new MEAL_PRODUCTS format first
        const mealProductsMatch = content.match(/\[MEAL_PRODUCTS\]([\s\S]*?)\[\/MEAL_PRODUCTS\]/);
        if (mealProductsMatch) {
          try {
            const parsed = JSON.parse(mealProductsMatch[1].trim());
            const supplements: Array<{ name: string; reason: string; keywords: string[]; diseaseKeywords?: string[] }> =
              parsed.supplements || [];

            // For each supplement, search the store products by keywords
            const seen = new Set<number>();
            for (const supp of supplements.slice(0, 6)) {
              const keywords = [supp.name, ...(supp.keywords || [])].filter(Boolean);
              const diseaseKws = supp.diseaseKeywords || userDiseases;
              const matched = await getProductsByKeywords(keywords, diseaseKws, 2);
              for (const p of matched) {
                if (!seen.has(p.id)) {
                  seen.add(p.id);
                  recommendedProducts.push({
                    ...p,
                    reason: supp.reason || `موصى به لخطتك الغذائية`,
                    supplement: supp.name,
                  });
                }
              }
            }
          } catch (e) {
            // fallback to old PRODUCTS format
          }
        }

        // Fallback: try old [PRODUCTS] format
        if (recommendedProducts.length === 0) {
          const productsMatch = content.match(/\[PRODUCTS\]([\s\S]*?)\[\/PRODUCTS\]/);
          if (productsMatch) {
            try {
              const parsed = JSON.parse(productsMatch[1].trim());
              const ids = parsed.products?.map((p: any) => p.id) || [];
              recommendedProducts = storeProducts.items
                .filter((p: any) => ids.includes(p.id))
                .map((p: any) => ({ ...p, reason: parsed.products.find((r: any) => r.id === p.id)?.reason }));
            } catch (e) { /* ignore */ }
          }
        }

        // If still no products but we have user diseases, do a smart fallback
        if (recommendedProducts.length === 0 && userDiseases.length > 0 && content.length > 200) {
          const fallbackProducts = await getProductsByKeywords([], userDiseases, 4);
          recommendedProducts = fallbackProducts.map(p => ({
            ...p,
            reason: `مناسب لحالتك الصحية`,
          }));
        }

        // Check if PDF is ready
        const pdfReady = content.includes("[PDF_READY]");

        // Clean content from all blocks
        const cleanContent = content
          .replace(/\[MEAL_PRODUCTS\][\s\S]*?\[\/MEAL_PRODUCTS\]/g, "")
          .replace(/\[PRODUCTS\][\s\S]*?\[\/PRODUCTS\]/g, "")
          .replace(/\[PDF_READY\][\s\S]*?\[\/PDF_READY\]/g, "")
          .replace("[PDF_READY]", "")
          .trim();

        return {
          message: cleanContent,
          recommendedProducts,
          pdfReady,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
