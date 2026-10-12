
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seed başlıyor...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-isletme" },
    update: {},
    create: {
      name: "Demo İşletme",
      slug: "demo-isletme",
      settings: {
        currency: "TRY",
        language: "tr",
        timezone: "Europe/Istanbul",
      },
      enabledModules: ["core", "inventory", "finance"],
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  const passwordHash = await bcrypt.hash("demo1234", 12);
  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "admin@demo.com",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo.com",
      passwordHash,
      firstName: "Demo",
      lastName: "Admin",
      role: "OWNER",
      permissions: ["*"], 
    },
  });
  console.log(`✅ User: ${user.email} (şifre: demo1234)`);

  const countGroup = await prisma.unitGroup.create({
    data: {
      tenantId: tenant.id,
      name: "Adet/Sayı",
      description: "Sayılabilen birimler",
    },
  });

  const adet = await prisma.unit.create({
    data: {
      tenantId: tenant.id,
      groupId: countGroup.id,
      name: "Adet",
      symbol: "ad",
      isBase: true,
    },
  });

  const koli = await prisma.unit.create({
    data: {
      tenantId: tenant.id,
      groupId: countGroup.id,
      name: "Koli",
      symbol: "koli",
      isBase: false,
    },
  });

  const duzine = await prisma.unit.create({
    data: {
      tenantId: tenant.id,
      groupId: countGroup.id,
      name: "Düzine",
      symbol: "düz",
      isBase: false,
    },
  });

  const weightGroup = await prisma.unitGroup.create({
    data: {
      tenantId: tenant.id,
      name: "Ağırlık",
      description: "Kütle birimleri",
    },
  });

  const gram = await prisma.unit.create({
    data: {
      tenantId: tenant.id,
      groupId: weightGroup.id,
      name: "Gram",
      symbol: "g",
      isBase: true,
    },
  });

  const kilogram = await prisma.unit.create({
    data: {
      tenantId: tenant.id,
      groupId: weightGroup.id,
      name: "Kilogram",
      symbol: "kg",
      isBase: false,
    },
  });

  const ton = await prisma.unit.create({
    data: {
      tenantId: tenant.id,
      groupId: weightGroup.id,
      name: "Ton",
      symbol: "ton",
      isBase: false,
    },
  });

  const volumeGroup = await prisma.unitGroup.create({
    data: {
      tenantId: tenant.id,
      name: "Hacim",
      description: "Sıvı ve hacim birimleri",
    },
  });

  const mililitre = await prisma.unit.create({
    data: {
      tenantId: tenant.id,
      groupId: volumeGroup.id,
      name: "Mililitre",
      symbol: "ml",
      isBase: true,
    },
  });

  const litre = await prisma.unit.create({
    data: {
      tenantId: tenant.id,
      groupId: volumeGroup.id,
      name: "Litre",
      symbol: "lt",
      isBase: false,
    },
  });

  console.log("✅ Birim grupları ve birimler oluşturuldu");

  await prisma.unitConversion.createMany({
    data: [
      { tenantId: tenant.id, fromUnitId: koli.id, toUnitId: adet.id, factor: 24 },
      { tenantId: tenant.id, fromUnitId: duzine.id, toUnitId: adet.id, factor: 12 },
      { tenantId: tenant.id, fromUnitId: kilogram.id, toUnitId: gram.id, factor: 1000 },
      { tenantId: tenant.id, fromUnitId: ton.id, toUnitId: kilogram.id, factor: 1000 },
      { tenantId: tenant.id, fromUnitId: litre.id, toUnitId: mililitre.id, factor: 1000 },
    ],
  });
  console.log("✅ Birim dönüşümleri oluşturuldu");

  const kasa = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      name: "Ana Kasa",
      type: "CASH",
      code: "100",
    },
  });

  await prisma.account.create({
    data: {
      tenantId: tenant.id,
      name: "Banka Hesabı",
      type: "BANK",
      code: "102",
    },
  });

  const tedarikci = await prisma.account.create({
    data: {
      tenantId: tenant.id,
      name: "Genel Tedarikçi",
      type: "SUPPLIER",
      code: "320",
    },
  });
  console.log("✅ Hesaplar oluşturuldu");

  const kola = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      name: "Coca-Cola 330ml",
      sku: "KOLA-330",
      barcode: "8690000000001",
      type: "PRODUCT",
      baseUnitId: adet.id,
      metadata: {
        marka: "Coca-Cola",
        hacim: "330ml",
        kategori: "İçecek",
        rafNo: "A1",
      },
    },
  });

  await prisma.itemUnit.create({
    data: {
      tenantId: tenant.id,
      itemId: kola.id,
      unitId: koli.id,
      conversionFactor: 24, 
      price: 480, 
    },
  });

  const un = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      name: "Un (Çuval)",
      sku: "UN-25KG",
      type: "RAW_MATERIAL",
      baseUnitId: kilogram.id,
      metadata: {
        marka: "Söke",
        tip: "Ekmeklik",
        kategori: "Hammadde",
      },
    },
  });

  console.log("✅ Örnek ürünler oluşturuldu");

  await prisma.movementLedger.create({
    data: {
      tenantId: tenant.id,
      itemId: kola.id,
      accountId: tedarikci.id,
      movementType: "PURCHASE",
      direction: "IN",
      quantity: 240,
      unitId: adet.id,
      unitCost: 15,
      totalAmount: 3600,
      description: "10 koli kola alışı",
      metadata: { faturNo: "FTR-001", koliAdedi: 10 },
    },
  });

  await prisma.movementLedger.create({
    data: {
      tenantId: tenant.id,
      accountId: kasa.id,
      movementType: "PURCHASE",
      direction: "OUT",
      quantity: 1,
      unitId: adet.id,
      unitCost: 3600,
      totalAmount: 3600,
      description: "Kola alışı ödemesi",
      metadata: { faturNo: "FTR-001" },
    },
  });

  await prisma.movementLedger.create({
    data: {
      tenantId: tenant.id,
      itemId: kola.id,
      movementType: "SALE",
      direction: "OUT",
      quantity: 5,
      unitId: adet.id,
      unitCost: 25,
      totalAmount: 125,
      description: "5 adet kola satışı",
    },
  });

  await prisma.movementLedger.create({
    data: {
      tenantId: tenant.id,
      itemId: un.id,
      accountId: tedarikci.id,
      movementType: "PURCHASE",
      direction: "IN",
      quantity: 50,
      unitId: kilogram.id,
      unitCost: 40,
      totalAmount: 2000,
      description: "2 çuval un alışı (25kg x 2)",
    },
  });

  console.log("✅ Örnek stok hareketleri oluşturuldu");
  console.log("\n🎉 Seed tamamlandı!");
  console.log("📧 Giriş bilgileri: admin@demo.com / demo1234");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed hatası:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
