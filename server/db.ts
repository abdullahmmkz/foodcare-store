import { and, desc, eq, ilike, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { diseases, InsertDisease, InsertLocalUser, InsertProduct, InsertUser, localUsers, products, users } from "../drizzle/schema";
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
      clicks: products.clicks,
      featured: products.featured,
      createdAt: products.createdAt,
      diseaseName: diseases.nameAr,
    })
    .from(products)
    .leftJoin(diseases, eq(products.diseaseId, diseases.id))
    .orderBy(desc(products.createdAt));
}
