
import { prisma } from "@/server/db";
import { PrismaClient } from "@prisma/client";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
}

export async function validateTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, isActive: true, enabledModules: true },
  });

  if (!tenant) {
    throw new Error(`Tenant bulunamadı: ${tenantId}`);
  }

  if (!tenant.isActive) {
    throw new Error(`Tenant aktif değil: ${tenantId}`);
  }

  return tenant;
}

export function isModuleEnabled(
  enabledModules: unknown,
  moduleSlug: string
): boolean {
  if (!Array.isArray(enabledModules)) return false;
  return enabledModules.includes(moduleSlug);
}

export function tenantWhere(tenantId: string) {
  return { tenantId };
}

export function paginate(page: number = 1, pageSize: number = 20) {
  const take = Math.min(Math.max(pageSize, 1), 100); 
  const skip = (Math.max(page, 1) - 1) * take;
  return { take, skip };
}

export type { PrismaClient };
