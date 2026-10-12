
export interface TypeInfo {
  label: string;
  cls: string;
}

export const MOVEMENT_TYPE_MAP: Record<string, TypeInfo> = {
  PURCHASE: { label: "Alış", cls: "b-blue" },
  SALE: { label: "Satış", cls: "b-emerald" },
  PRODUCTION: { label: "Üretim Çıkışı", cls: "b-violet" },
  PRODUCTION_IN: { label: "Üretim Girişi", cls: "b-emerald" },
  PRODUCTION_OUT: { label: "Üretim Çıkışı", cls: "b-violet" },
  RETURN: { label: "İade", cls: "b-amber" },
  WASTE: { label: "Fire", cls: "b-rose" },
  ADJUSTMENT: { label: "Düzeltme", cls: "b-amber" },
  TRANSFER: { label: "Transfer", cls: "b-blue" },
};

export function getMovementTypeInfo(type?: string | null): TypeInfo {
  if (!type) return { label: "—", cls: "b-amber" };
  const normalized = type.toUpperCase().replace(/\s+/g, "_");
  return MOVEMENT_TYPE_MAP[normalized] || { label: type, cls: "b-amber" };
}

export const ACCOUNT_TYPE_MAP: Record<string, TypeInfo> = {
  CASH: { label: "Kasa", cls: "b-emerald" },
  BANK: { label: "Banka", cls: "b-blue" },
  SUPPLIER: { label: "Tedarikçi", cls: "b-amber" },
  CUSTOMER: { label: "Müşteri", cls: "b-violet" },
  EXPENSE: { label: "Gider", cls: "b-rose" },
  REVENUE: { label: "Gelir", cls: "b-emerald" },
};

export function getAccountTypeInfo(type?: string | null): TypeInfo {
  if (!type) return { label: "—", cls: "b-blue" };
  const normalized = type.toUpperCase();
  return ACCOUNT_TYPE_MAP[normalized] || { label: type, cls: "b-blue" };
}

export const ORDER_STATUS_MAP: Record<string, TypeInfo> = {
  DRAFT: { label: "Taslak", cls: "b-amber" },
  PENDING: { label: "Beklemede", cls: "b-amber" },
  COMPLETED: { label: "Tamamlandı", cls: "b-emerald" },
  CANCELLED: { label: "İptal", cls: "b-rose" },
};

export function getOrderStatusInfo(status?: string | null): TypeInfo {
  if (!status) return { label: "—", cls: "b-amber" };
  const normalized = status.toUpperCase();
  return ORDER_STATUS_MAP[normalized] || { label: status, cls: "b-amber" };
}

export const ITEM_TYPE_MAP: Record<string, TypeInfo> = {
  PRODUCT: { label: "Ürün", cls: "b-blue" },
  RAW_MATERIAL: { label: "Hammadde", cls: "b-amber" },
  SEMI_FINISHED: { label: "Yarı Mamul", cls: "b-violet" },
  SERVICE: { label: "Hizmet", cls: "b-emerald" },
};

export function getItemTypeInfo(type?: string | null): TypeInfo {
  if (!type) return { label: "—", cls: "b-blue" };
  const normalized = type.toUpperCase();
  return ITEM_TYPE_MAP[normalized] || { label: type, cls: "b-blue" };
}
