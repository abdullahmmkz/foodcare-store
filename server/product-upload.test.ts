import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock storagePut
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://cdn.example.com/product-images/test-image.jpg",
    key: "product-images/test-image.jpg",
  }),
}));

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "local",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "local",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("products.uploadImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin to upload a product image and returns URL", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a small valid base64 image (1x1 pixel PNG)
    const tinyPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const result = await caller.products.uploadImage({
      base64: tinyPngBase64,
      mimeType: "image/png",
      fileName: "test-product.png",
    });

    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("key");
    expect(typeof result.url).toBe("string");
    expect(result.url).toContain("http");
  });

  it("rejects non-admin users with FORBIDDEN error", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.products.uploadImage({
        base64: "dGVzdA==",
        mimeType: "image/jpeg",
        fileName: "test.jpg",
      })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, cookies: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.products.uploadImage({
        base64: "dGVzdA==",
        mimeType: "image/jpeg",
        fileName: "test.jpg",
      })
    ).rejects.toThrow();
  });

  it("rejects oversized images (> 10MB base64)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a string larger than 14MB
    const oversizedBase64 = "A".repeat(15_000_000);

    await expect(
      caller.products.uploadImage({
        base64: oversizedBase64,
        mimeType: "image/jpeg",
        fileName: "huge.jpg",
      })
    ).rejects.toThrow("حجم الصورة كبير جداً");
  });

  it("generates unique key with product-images/ prefix", async () => {
    const { storagePut } = await import("./storage");
    const mockStoragePut = storagePut as ReturnType<typeof vi.fn>;

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const tinyPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    await caller.products.uploadImage({
      base64: tinyPngBase64,
      mimeType: "image/png",
      fileName: "product.png",
    });

    expect(mockStoragePut).toHaveBeenCalledOnce();
    const [key, , mimeType] = mockStoragePut.mock.calls[0];
    expect(key).toMatch(/^product-images\/\d+-[a-z0-9]+\.png$/);
    expect(mimeType).toBe("image/png");
  });

  it("uses correct file extension from fileName", async () => {
    const { storagePut } = await import("./storage");
    const mockStoragePut = storagePut as ReturnType<typeof vi.fn>;

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const tinyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    await caller.products.uploadImage({
      base64: tinyBase64,
      mimeType: "image/webp",
      fileName: "my-product.webp",
    });

    const [key] = mockStoragePut.mock.calls[0];
    expect(key).toMatch(/\.webp$/);
  });
});
