
import Decimal from "decimal.js";
import { prisma } from "@/server/db";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface ConversionResult {
  fromUnitId: string;
  toUnitId: string;
  factor: Decimal;
  originalQuantity: Decimal;
  convertedQuantity: Decimal;
  path: string[]; 
}

export async function convertUnit(
  tenantId: string,
  fromUnitId: string,
  toUnitId: string,
  quantity: number | string | Decimal
): Promise<ConversionResult> {
  if (fromUnitId === toUnitId) {
    const qty = new Decimal(quantity);
    return {
      fromUnitId,
      toUnitId,
      factor: new Decimal(1),
      originalQuantity: qty,
      convertedQuantity: qty,
      path: [],
    };
  }

  const directConversion = await prisma.unitConversion.findUnique({
    where: {
      tenantId_fromUnitId_toUnitId: {
        tenantId,
        fromUnitId,
        toUnitId,
      },
    },
    include: {
      fromUnit: { select: { name: true } },
      toUnit: { select: { name: true } },
    },
  });

  if (directConversion) {
    const qty = new Decimal(quantity);
    const factor = new Decimal(directConversion.factor.toString());
    return {
      fromUnitId,
      toUnitId,
      factor,
      originalQuantity: qty,
      convertedQuantity: qty.mul(factor),
      path: [directConversion.fromUnit.name, directConversion.toUnit.name],
    };
  }

  const reverseConversion = await prisma.unitConversion.findUnique({
    where: {
      tenantId_fromUnitId_toUnitId: {
        tenantId,
        fromUnitId: toUnitId,
        toUnitId: fromUnitId,
      },
    },
    include: {
      fromUnit: { select: { name: true } },
      toUnit: { select: { name: true } },
    },
  });

  if (reverseConversion) {
    const qty = new Decimal(quantity);
    const factor = new Decimal(1).div(
      new Decimal(reverseConversion.factor.toString())
    );
    return {
      fromUnitId,
      toUnitId,
      factor,
      originalQuantity: qty,
      convertedQuantity: qty.mul(factor),
      path: [reverseConversion.toUnit.name, reverseConversion.fromUnit.name],
    };
  }

  const result = await findConversionPath(tenantId, fromUnitId, toUnitId, quantity);
  if (result) return result;

  throw new Error(
    `Birim dönüşümü bulunamadı: ${fromUnitId} → ${toUnitId}`
  );
}

async function findConversionPath(
  tenantId: string,
  fromUnitId: string,
  toUnitId: string,
  quantity: number | string | Decimal
): Promise<ConversionResult | null> {
  const allConversions = await prisma.unitConversion.findMany({
    where: { tenantId },
    include: {
      fromUnit: { select: { id: true, name: true } },
      toUnit: { select: { id: true, name: true } },
    },
  });

  const graph = new Map<string, { targetId: string; factor: Decimal; name: string }[]>();

  for (const conv of allConversions) {
    if (!graph.has(conv.fromUnitId)) graph.set(conv.fromUnitId, []);
    graph.get(conv.fromUnitId)!.push({
      targetId: conv.toUnitId,
      factor: new Decimal(conv.factor.toString()),
      name: conv.toUnit.name,
    });

    if (!graph.has(conv.toUnitId)) graph.set(conv.toUnitId, []);
    graph.get(conv.toUnitId)!.push({
      targetId: conv.fromUnitId,
      factor: new Decimal(1).div(new Decimal(conv.factor.toString())),
      name: conv.fromUnit.name,
    });
  }

  const visited = new Set<string>();
  const queue: { unitId: string; factor: Decimal; path: string[] }[] = [];

  const startUnit = allConversions.find(
    (c) => c.fromUnitId === fromUnitId || c.toUnitId === fromUnitId
  );
  const startName =
    startUnit?.fromUnitId === fromUnitId
      ? startUnit.fromUnit.name
      : startUnit?.toUnit.name ?? "?";

  queue.push({ unitId: fromUnitId, factor: new Decimal(1), path: [startName] });
  visited.add(fromUnitId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = graph.get(current.unitId) || [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.targetId)) continue;

      const newFactor = current.factor.mul(neighbor.factor);
      const newPath = [...current.path, neighbor.name];

      if (neighbor.targetId === toUnitId) {
        const qty = new Decimal(quantity);
        return {
          fromUnitId,
          toUnitId,
          factor: newFactor,
          originalQuantity: qty,
          convertedQuantity: qty.mul(newFactor),
          path: newPath,
        };
      }

      visited.add(neighbor.targetId);
      queue.push({
        unitId: neighbor.targetId,
        factor: newFactor,
        path: newPath,
      });
    }
  }

  return null;
}

export async function getItemStock(
  tenantId: string,
  itemId: string,
  unitId?: string
): Promise<Decimal> {
  const movements = await prisma.movementLedger.findMany({
    where: { tenantId, itemId },
    select: { direction: true, quantity: true, unitId: true },
  });

  let balance = new Decimal(0);

  for (const mov of movements) {
    const qty = new Decimal(mov.quantity.toString());

    if (unitId && mov.unitId !== unitId) {
      try {
        const converted = await convertUnit(tenantId, mov.unitId, unitId, qty);
        const adjusted =
          mov.direction === "IN"
            ? converted.convertedQuantity
            : converted.convertedQuantity.neg();
        balance = balance.add(adjusted);
      } catch {
        continue;
      }
    } else {
      balance =
        mov.direction === "IN" ? balance.add(qty) : balance.sub(qty);
    }
  }

  return balance;
}
