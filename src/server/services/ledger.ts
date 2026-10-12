
import Decimal from "decimal.js";
import { prisma } from "@/server/db";
import { getItemStock } from "@/lib/units";

export const MOVEMENT_TYPES = {
  PURCHASE: "PURCHASE",       
  SALE: "SALE",               
  TRANSFER: "TRANSFER",       
  ADJUSTMENT: "ADJUSTMENT",   
  PRODUCTION: "PRODUCTION",   
  PRODUCTION_IN: "PRODUCTION_IN", 
  WASTE: "WASTE",             
  RETURN: "RETURN",           
} as const;

export type MovementType = (typeof MOVEMENT_TYPES)[keyof typeof MOVEMENT_TYPES];

export interface CreateMovementInput {
  tenantId: string;
  itemId?: string;
  accountId?: string;
  movementType: MovementType;
  direction: "IN" | "OUT";
  quantity: number | string;
  unitId: string;
  unitCost: number | string;
  referenceId?: string;
  referenceType?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export async function createMovement(input: CreateMovementInput) {
  const quantity = new Decimal(input.quantity);
  const unitCost = new Decimal(input.unitCost);
  const totalAmount = quantity.mul(unitCost);

  if (input.direction === "OUT" && input.itemId) {
    const currentStock = await getItemStock(
      input.tenantId,
      input.itemId,
      input.unitId
    );
    if (currentStock.lt(quantity)) {
      throw new Error(
        `Yetersiz stok. Mevcut: ${currentStock.toString()}, İstenen: ${quantity.toString()}`
      );
    }
  }

  const movement = await prisma.movementLedger.create({
    data: {
      tenantId: input.tenantId,
      itemId: input.itemId,
      accountId: input.accountId,
      movementType: input.movementType,
      direction: input.direction,
      quantity: quantity.toNumber(),
      unitId: input.unitId,
      unitCost: unitCost.toNumber(),
      totalAmount: totalAmount.toNumber(),
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
      metadata: input.metadata ?? {},
    },
  });

  return movement;
}

export async function createDoubleEntry(
  stockMovement: CreateMovementInput,
  financialMovement: CreateMovementInput
) {
  return prisma.$transaction(async (tx) => {
    const quantity = new Decimal(stockMovement.quantity);
    const unitCost = new Decimal(stockMovement.unitCost);
    const totalAmount = quantity.mul(unitCost);

    const finQuantity = new Decimal(financialMovement.quantity);
    const finUnitCost = new Decimal(financialMovement.unitCost);
    const finTotalAmount = finQuantity.mul(finUnitCost);

    const stock = await tx.movementLedger.create({
      data: {
        tenantId: stockMovement.tenantId,
        itemId: stockMovement.itemId,
        accountId: stockMovement.accountId,
        movementType: stockMovement.movementType,
        direction: stockMovement.direction,
        quantity: quantity.toNumber(),
        unitId: stockMovement.unitId,
        unitCost: unitCost.toNumber(),
        totalAmount: totalAmount.toNumber(),
        referenceId: stockMovement.referenceId,
        referenceType: stockMovement.referenceType,
        description: stockMovement.description,
        metadata: stockMovement.metadata ?? {},
      },
    });

    const finance = await tx.movementLedger.create({
      data: {
        tenantId: financialMovement.tenantId,
        itemId: financialMovement.itemId,
        accountId: financialMovement.accountId,
        movementType: financialMovement.movementType,
        direction: financialMovement.direction,
        quantity: finQuantity.toNumber(),
        unitId: financialMovement.unitId,
        unitCost: finUnitCost.toNumber(),
        totalAmount: finTotalAmount.toNumber(),
        referenceId: financialMovement.referenceId,
        referenceType: financialMovement.referenceType,
        description: financialMovement.description,
        metadata: financialMovement.metadata ?? {},
      },
    });

    return { stock, finance };
  });
}

export async function getMovements(
  tenantId: string,
  filters: {
    itemId?: string;
    accountId?: string;
    movementType?: MovementType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { page = 1, pageSize = 50, ...where } = filters;
  const take = Math.min(Math.max(pageSize, 1), 100);
  const skip = (Math.max(page, 1) - 1) * take;

  const [movements, total] = await Promise.all([
    prisma.movementLedger.findMany({
      where: {
        tenantId,
        ...(where.itemId && { itemId: where.itemId }),
        ...(where.accountId && { accountId: where.accountId }),
        ...(where.movementType && { movementType: where.movementType }),
        ...(where.startDate || where.endDate
          ? {
              createdAt: {
                ...(where.startDate && { gte: where.startDate }),
                ...(where.endDate && { lte: where.endDate }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        item: { select: { name: true, sku: true } },
        account: { select: { name: true, type: true } },
        unit: { select: { name: true, symbol: true } },
      },
    }),
    prisma.movementLedger.count({
      where: {
        tenantId,
        ...(where.itemId && { itemId: where.itemId }),
        ...(where.accountId && { accountId: where.accountId }),
        ...(where.movementType && { movementType: where.movementType }),
      },
    }),
  ]);

  return {
    data: movements,
    pagination: {
      page,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take),
    },
  };
}
