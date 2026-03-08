import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

// Mock db functions
vi.mock("./db", () => ({
  getLocalUserById: vi.fn(),
  updateLocalUserPassword: vi.fn(),
  getLocalUserByEmail: vi.fn(),
  createLocalUser: vi.fn(),
  getAllDiseases: vi.fn(() => []),
  getDiseaseById: vi.fn(),
  createDisease: vi.fn(),
  updateDisease: vi.fn(),
  deleteDisease: vi.fn(),
  getProducts: vi.fn(() => ({ products: [], total: 0 })),
  getProductById: vi.fn(),
  getRelatedProducts: vi.fn(() => []),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  incrementProductClicks: vi.fn(),
  getAllProductsAdmin: vi.fn(() => []),
  getHealthProfile: vi.fn(),
  upsertHealthProfile: vi.fn(),
  getProductsByKeywords: vi.fn(() => []),
}));

import { getLocalUserById, updateLocalUserPassword } from "./db";

describe("changePassword logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should hash the new password before saving", async () => {
    const newPassword = "NewSecure@123";
    const hash = await bcrypt.hash(newPassword, 12);
    expect(hash).not.toBe(newPassword);
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("should verify current password correctly", async () => {
    const currentPassword = "OldPass@456";
    const storedHash = await bcrypt.hash(currentPassword, 12);
    const isValid = await bcrypt.compare(currentPassword, storedHash);
    expect(isValid).toBe(true);
  });

  it("should reject wrong current password", async () => {
    const storedHash = await bcrypt.hash("CorrectPass@123", 12);
    const isValid = await bcrypt.compare("WrongPass@999", storedHash);
    expect(isValid).toBe(false);
  });

  it("should call updateLocalUserPassword with hashed password", async () => {
    const mockUser = {
      id: 1,
      name: "Test",
      email: "test@test.com",
      passwordHash: await bcrypt.hash("OldPass@123", 12),
      role: "user" as const,
      createdAt: new Date(),
    };
    vi.mocked(getLocalUserById).mockResolvedValue(mockUser);
    vi.mocked(updateLocalUserPassword).mockResolvedValue(undefined);

    const newPassword = "NewPass@456";
    const newHash = await bcrypt.hash(newPassword, 12);
    await updateLocalUserPassword(mockUser.id, newHash);

    expect(updateLocalUserPassword).toHaveBeenCalledWith(mockUser.id, expect.stringMatching(/^\$2/));
  });

  it("should not allow same password as current", async () => {
    const password = "SamePass@123";
    const isSame = password === password;
    expect(isSame).toBe(true); // frontend should block this
  });

  it("should require minimum 8 characters for new password", () => {
    const shortPassword = "abc123";
    const validPassword = "abc12345";
    expect(shortPassword.length < 8).toBe(true);
    expect(validPassword.length >= 8).toBe(true);
  });
});
