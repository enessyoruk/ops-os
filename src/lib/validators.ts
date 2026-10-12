
import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(2, "İşletme adı en az 2 karakter olmalı").max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug sadece küçük harf, rakam ve tire içerebilir"
    ),
});

export const createUserSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
  firstName: z.string().min(1, "Ad zorunlu").max(100),
  lastName: z.string().min(1, "Soyad zorunlu").max(100),
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "STAFF"]).default("STAFF"),
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(1, "Şifre zorunlu"),
});

export const createItemSchema = z.object({
  name: z.string().min(1, "Ürün adı zorunlu").max(255),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  type: z
    .enum(["PRODUCT", "RAW_MATERIAL", "SEMI_FINISHED", "SERVICE"])
    .default("PRODUCT"),
  baseUnitId: z.string().uuid("Geçerli bir birim ID'si girin"),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const updateItemSchema = createItemSchema.partial().extend({
  id: z.string().uuid(),
});

export const createUnitGroupSchema = z.object({
  name: z.string().min(1, "Grup adı zorunlu").max(100),
  description: z.string().max(255).optional(),
});

export const createUnitSchema = z.object({
  groupId: z.string().uuid("Geçerli bir grup ID'si girin"),
  name: z.string().min(1, "Birim adı zorunlu").max(100),
  symbol: z.string().min(1, "Birim sembolü zorunlu").max(20),
  isBase: z.boolean().default(false),
});

export const createUnitConversionSchema = z.object({
  fromUnitId: z.string().uuid(),
  toUnitId: z.string().uuid(),
  factor: z.number().positive("Dönüşüm faktörü pozitif olmalı"),
});

export const createAccountSchema = z.object({
  name: z.string().min(1, "Hesap adı zorunlu").max(255),
  type: z.enum(["CASH", "BANK", "SUPPLIER", "CUSTOMER", "EXPENSE", "REVENUE"]),
  code: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const createMovementSchema = z.object({
  itemId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  movementType: z.enum([
    "PURCHASE",
    "SALE",
    "TRANSFER",
    "ADJUSTMENT",
    "PRODUCTION",
    "PRODUCTION_IN",
    "WASTE",
    "RETURN",
  ]),
  direction: z.enum(["IN", "OUT"]),
  quantity: z.number().positive("Miktar pozitif olmalı"),
  unitId: z.string().uuid(),
  unitCost: z.number().min(0, "Birim maliyet negatif olamaz"),
  referenceId: z.string().uuid().optional(),
  referenceType: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const createOrderItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive("Sipariş miktarı pozitif olmalı"),
  unitId: z.string().uuid(),
  unitPrice: z.number().min(0, "Birim fiyat negatif olamaz"),
});

export const createOrderSchema = z.object({
  accountId: z.string().uuid("Geçerli bir müşteri/tedarikçi hesabı seçin"),
  type: z.enum(["SALES", "PURCHASE"]).default("SALES"),
  status: z.enum(["DRAFT", "COMPLETED", "CANCELLED"]).default("DRAFT"),
  notes: z.string().max(500).optional(),
  items: z.array(createOrderItemSchema).min(1, "Siparişte en az bir ürün bulunmalı"),
});
