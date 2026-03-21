import { and, desc, eq, ilike, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { cartItems, diseases, healthProfiles, InsertDisease, InsertHealthProfile, InsertLocalUser, InsertProduct, InsertUser, localUsers, products, users, wishlist } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Diseases ────────────────────────────────────────────────────────────────

export async function getAllDiseases() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(diseases).orderBy(diseases.id);
}

export async function getDiseaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(diseases).where(eq(diseases.id, id)).limit(1);
  return result[0];
}

export async function createDisease(data: InsertDisease) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(diseases).values(data);
  return result;
}

export async function updateDisease(id: number, data: Partial<InsertDisease>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(diseases).set({ ...data, updatedAt: new Date() }).where(eq(diseases.id, id));
}

export async function deleteDisease(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(diseases).where(eq(diseases.id, id));
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface GetProductsOptions {
  diseaseId?: number;
  search?: string;
  sort?: "newest" | "popular" | "cheapest";
  limit?: number;
  offset?: number;
}

export async function getProducts(opts: GetProductsOptions = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const { diseaseId, search, sort = "newest", limit = 12, offset = 0 } = opts;

  const conditions = [];
  if (diseaseId) conditions.push(eq(products.diseaseId, diseaseId));
  if (search) {
    conditions.push(
      or(
        like(products.name, `%${search}%`),
        sql`EXISTS (SELECT 1 FROM diseases d WHERE d.id = ${products.diseaseId} AND d.nameAr LIKE ${`%${search}%`})`
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy =
    sort === "popular" ? desc(products.clicks) :
    sort === "cheapest" ? products.price :
    desc(products.createdAt);

  const items = await db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      link: products.link,
      diseaseId: products.diseaseId,
      price: products.price,
      description: products.description,
      clicks: products.clicks,
      featured: products.featured,
      createdAt: products.createdAt,
      diseaseName: diseases.nameAr,
      diseaseIcon: diseases.icon,
    })
    .from(products)
    .leftJoin(diseases, eq(products.diseaseId, diseases.id))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .leftJoin(diseases, eq(products.diseaseId, diseases.id))
    .where(whereClause);

  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      link: products.link,
      diseaseId: products.diseaseId,
      price: products.price,
      description: products.description,
      clicks: products.clicks,
      featured: products.featured,
      createdAt: products.createdAt,
      diseaseName: diseases.nameAr,
      diseaseIcon: diseases.icon,
    })
    .from(products)
    .leftJoin(diseases, eq(products.diseaseId, diseases.id))
    .where(eq(products.id, id))
    .limit(1);
  return result[0];
}

export async function getRelatedProducts(diseaseId: number, excludeId: number, limit = 4) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      link: products.link,
      diseaseId: products.diseaseId,
      price: products.price,
      description: products.description,
      clicks: products.clicks,
      featured: products.featured,
      createdAt: products.createdAt,
      diseaseName: diseases.nameAr,
      diseaseIcon: diseases.icon,
    })
    .from(products)
    .leftJoin(diseases, eq(products.diseaseId, diseases.id))
    .where(and(eq(products.diseaseId, diseaseId), sql`${products.id} != ${excludeId}`))
    .orderBy(desc(products.clicks))
    .limit(limit);
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(products).values(data);
  return result;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(products).where(eq(products.id, id));
}

export async function incrementProductClicks(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(products).set({ clicks: sql`${products.clicks} + 1` }).where(eq(products.id, id));
}

// ─── Local Users ─────────────────────────────────────────────────────────────

export async function createLocalUser(data: InsertLocalUser): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(localUsers).values(data);
  return (result as any)[0]?.insertId ?? 0;
}

export async function getLocalUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(localUsers).where(eq(localUsers.email, email)).limit(1);
  return result[0];
}

export async function getLocalUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(localUsers).where(eq(localUsers.id, id)).limit(1);
  return result[0];
}

export async function updateLocalUserPassword(id: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(localUsers).set({ passwordHash }).where(eq(localUsers.id, id));
}

// ─── Wishlist ────────────────────────────────────────────────────────────────
export async function getWishlistByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: wishlist.id,
      productId: wishlist.productId,
      createdAt: wishlist.createdAt,
      productName: products.name,
      productImage: products.image,
      productLink: products.link,
      productPrice: products.price,
      diseaseId: products.diseaseId,
      diseaseName: diseases.nameAr,
    })
    .from(wishlist)
    .leftJoin(products, eq(wishlist.productId, products.id))
    .leftJoin(diseases, eq(products.diseaseId, diseases.id))
    .where(eq(wishlist.userId, userId))
    .orderBy(desc(wishlist.createdAt));
}

export async function addToWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return;
  // Check if already exists
  const existing = await db.select().from(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(wishlist).values({ userId, productId });
}

export async function removeFromWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(wishlist).where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)));
}

export async function isInWishlist(userId: number, productId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)))
    .limit(1);
  return result.length > 0;
}

export async function getWishlistProductIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ productId: wishlist.productId }).from(wishlist).where(eq(wishlist.userId, userId));
  return result.map(r => r.productId);
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export async function getCartByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      createdAt: cartItems.createdAt,
      productName: products.name,
      productImage: products.image,
      productLink: products.link,
      productPrice: products.price,
      diseaseId: products.diseaseId,
      diseaseName: diseases.nameAr,
    })
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(diseases, eq(products.diseaseId, diseases.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(desc(cartItems.createdAt));
}

export async function addToCart(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(cartItems)
      .set({ quantity: existing[0].quantity + 1 })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({ userId, productId, quantity: 1 });
  }
}

export async function removeFromCart(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cartItems).where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
}

export async function updateCartQuantity(userId: number, productId: number, quantity: number) {
  const db = await getDb();
  if (!db) return;
  if (quantity <= 0) {
    await removeFromCart(userId, productId);
    return;
  }
  await db.update(cartItems)
    .set({ quantity })
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
}

export async function getCartProductIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ productId: cartItems.productId }).from(cartItems).where(eq(cartItems.userId, userId));
  return result.map(r => r.productId);
}

// ─── Health Profile ──────────────────────────────────────────────────────────

export async function getHealthProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function upsertHealthProfile(userId: number, data: Omit<InsertHealthProfile, 'userId'>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(healthProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(healthProfiles.userId, userId));
  } else {
    await db.insert(healthProfiles).values({ userId, ...data });
  }
  return getHealthProfile(userId);
}

// ─── Products by Keywords (for Chatbot) ─────────────────────────────────────

export async function getProductsByKeywords(keywords: string[], diseaseNames?: string[], limit = 6) {
  const db = await getDb();
  if (!db) return [];

  // Build OR conditions for keyword matching in product names
  const keywordConditions = keywords.map(kw =>
    like(products.name, `%${kw}%`)
  );

  // Also match by disease name if provided
  const diseaseConditions = (diseaseNames || []).map(dn =>
    sql`EXISTS (SELECT 1 FROM diseases d WHERE d.id = ${products.diseaseId} AND (d.nameAr LIKE ${`%${dn}%`} OR d.name LIKE ${`%${dn}%`}))`
  );

  const allConditions = [...keywordConditions, ...diseaseConditions];
  if (allConditions.length === 0) return [];

  const whereClause = or(...allConditions);

  return db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      link: products.link,
      diseaseId: products.diseaseId,
      price: products.price,
      clicks: products.clicks,
      featured: products.featured,
      diseaseName: diseases.nameAr,
      diseaseIcon: diseases.icon,
    })
    .from(products)
    .leftJoin(diseases, eq(products.diseaseId, diseases.id))
    .where(whereClause)
    .orderBy(desc(products.featured), desc(products.clicks))
    .limit(limit);
}

export async function getAllProductsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      link: products.link,
      diseaseId: products.diseaseId,
      price: products.price,
      description: products.description,
      clicks: products.clicks,
      featured: products.featured,
      createdAt: products.createdAt,
      diseaseName: diseases.nameAr,
    })
    .from(products)
    .leftJoin(diseases, eq(products.diseaseId, diseases.id))
    .orderBy(desc(products.createdAt));
}
