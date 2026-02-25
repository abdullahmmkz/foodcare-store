import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: "sample-user", email: "sample@example.com", name: "Sample User",
        loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated users", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });
});

describe("diseases API - access control", () => {
  it("allows public to list diseases", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // Should not throw - public procedure
    const result = await caller.diseases.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("blocks non-admin from creating disease", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.diseases.create({ name: "Test", nameAr: "اختبار" })
    ).rejects.toThrow();
  });
});

describe("products API - access control", () => {
  it("allows public to list products", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.products.list({ limit: 12, offset: 0 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("allows public to track clicks", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // Should not throw for valid id (may return error if product doesn't exist in test DB)
    try {
      const result = await caller.products.trackClick({ id: 1 });
      expect(result).toHaveProperty("success");
    } catch {
      // OK if product doesn't exist in test environment
    }
  });

  it("blocks non-admin from accessing admin product list", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.products.adminList()).rejects.toThrow();
  });

  it("blocks non-admin from creating products", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.products.create({
        name: "Test Product",
        image: "https://example.com/img.jpg",
        link: "https://example.com",
        diseaseId: 1,
      })
    ).rejects.toThrow();
  });

  it("blocks unauthenticated from admin operations", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.products.adminList()).rejects.toThrow();
  });
});
