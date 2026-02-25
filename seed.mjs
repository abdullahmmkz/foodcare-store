import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Import tables inline
const { diseases, products, users } = await import("./drizzle/schema.ts").catch(async () => {
  // fallback: use raw SQL
  return { diseases: null, products: null, users: null };
});

// Use raw SQL for seeding
async function seed() {
  console.log("🌱 Seeding database...");

  // Insert diseases
  await connection.execute(`
    INSERT IGNORE INTO diseases (id, name, nameAr, icon, createdAt, updatedAt) VALUES
    (1, 'Diabetes', 'السكري', '🩸', NOW(), NOW()),
    (2, 'Hypertension', 'الضغط', '💓', NOW(), NOW()),
    (3, 'Cholesterol', 'الكوليسترول', '🫀', NOW(), NOW()),
    (4, 'Obesity', 'السمنة', '⚖️', NOW(), NOW()),
    (5, 'Joints', 'المفاصل', '🦴', NOW(), NOW()),
    (6, 'Immunity', 'المناعة', '🛡️', NOW(), NOW())
  `);
  console.log("✅ Diseases seeded");

  // Insert products
  await connection.execute(`
    INSERT IGNORE INTO products (id, name, image, link, diseaseId, price, clicks, featured, createdAt, updatedAt) VALUES
    (1, 'مكمل الكروم لتنظيم السكر في الدم - 200 ميكروغرام', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop', 'https://www.amazon.com', 1, '45 ريال', 234, 1, NOW(), NOW()),
    (2, 'برنامج السكري الشامل - مكملات طبيعية', 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=400&fit=crop', 'https://www.noon.com', 1, '89 ريال', 187, 0, NOW(), NOW()),
    (3, 'أوميغا 3 لصحة القلب والأوعية الدموية', 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop', 'https://www.amazon.com', 2, '65 ريال', 312, 1, NOW(), NOW()),
    (4, 'مغنيسيوم لتنظيم ضغط الدم', 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&h=400&fit=crop', 'https://www.noon.com', 2, '38 ريال', 156, 0, NOW(), NOW()),
    (5, 'كيو 10 لصحة القلب', 'https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=400&fit=crop', 'https://www.amazon.com', 2, '120 ريال', 98, 0, NOW(), NOW()),
    (6, 'نياسين لخفض الكوليسترول الضار', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=400&fit=crop', 'https://www.amazon.com', 3, '55 ريال', 201, 1, NOW(), NOW()),
    (7, 'بيرغامين لتنظيم الكوليسترول', 'https://images.unsplash.com/photo-1616671276441-2f2c277b8bf6?w=400&h=400&fit=crop', 'https://www.noon.com', 3, '75 ريال', 143, 0, NOW(), NOW()),
    (8, 'ثيرموجينيك لحرق الدهون', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop', 'https://www.amazon.com', 4, '95 ريال', 267, 1, NOW(), NOW()),
    (9, 'جارسينيا كامبوجيا لتقليل الشهية', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop', 'https://www.noon.com', 4, '48 ريال', 189, 0, NOW(), NOW()),
    (10, 'بروتين واي لبناء العضلات وإنقاص الوزن', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=400&fit=crop', 'https://www.amazon.com', 4, '145 ريال', 334, 1, NOW(), NOW()),
    (11, 'كولاجين لصحة المفاصل', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop', 'https://www.noon.com', 5, '85 ريال', 176, 0, NOW(), NOW()),
    (12, 'جلوكوزامين لمفاصل قوية', 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=400&fit=crop', 'https://www.amazon.com', 5, '60 ريال', 122, 0, NOW(), NOW()),
    (13, 'فيتامين سي 1000 ملغ لتعزيز المناعة', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop', 'https://www.noon.com', 6, '35 ريال', 445, 1, NOW(), NOW()),
    (14, 'زنك وفيتامين د3 للمناعة', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop', 'https://www.amazon.com', 6, '52 ريال', 289, 0, NOW(), NOW()),
    (15, 'بروبيوتيك لصحة الجهاز الهضمي والمناعة', 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=400&fit=crop', 'https://www.noon.com', 6, '78 ريال', 198, 0, NOW(), NOW()),
    (16, 'إنسوليتول لتنظيم السكر', 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop', 'https://www.amazon.com', 1, '68 ريال', 134, 0, NOW(), NOW()),
    (17, 'ألفا ليبويك أسيد لمرضى السكري', 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&h=400&fit=crop', 'https://www.noon.com', 1, '92 ريال', 167, 0, NOW(), NOW()),
    (18, 'هوثورن لصحة القلب والضغط', 'https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=400&fit=crop', 'https://www.amazon.com', 2, '43 ريال', 88, 0, NOW(), NOW()),
    (19, 'ريد إيست رايس لخفض الكوليسترول', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=400&fit=crop', 'https://www.noon.com', 3, '110 ريال', 215, 1, NOW(), NOW()),
    (20, 'CLA لحرق الدهون وبناء العضلات', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop', 'https://www.amazon.com', 4, '72 ريال', 256, 0, NOW(), NOW()),
    (21, 'MSM لصحة المفاصل والغضاريف', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop', 'https://www.noon.com', 5, '55 ريال', 143, 0, NOW(), NOW()),
    (22, 'إلدربيري لتعزيز المناعة', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=400&fit=crop', 'https://www.amazon.com', 6, '88 ريال', 321, 1, NOW(), NOW()),
    (23, 'ماغنيسيوم جليسينات للنوم والضغط', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop', 'https://www.noon.com', 2, '67 ريال', 178, 0, NOW(), NOW()),
    (24, 'فيش أويل عالي التركيز', 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=400&fit=crop', 'https://www.amazon.com', 3, '95 ريال', 267, 0, NOW(), NOW())
  `);
  console.log("✅ Products seeded");

  // Set owner as admin
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (ownerOpenId) {
    await connection.execute(
      `UPDATE users SET role = 'admin' WHERE openId = ?`,
      [ownerOpenId]
    );
    console.log("✅ Owner set as admin");
  }

  console.log("🎉 Seeding complete!");
  await connection.end();
}

seed().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await connection.end();
  process.exit(1);
});
