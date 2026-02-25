import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAllDiseases, getDiseaseById, createDisease, updateDisease, deleteDisease,
  getProducts, getProductById, getRelatedProducts,
  createProduct, updateProduct, deleteProduct, incrementProductClicks,
  getAllProductsAdmin,
} from "./db";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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

    // Admin procedures
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
});

export type AppRouter = typeof appRouter;
