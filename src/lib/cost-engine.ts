
import { prisma } from "@/server/db";
import Decimal from "decimal.js";
import { convertUnit } from "./units";

export async function calculateItemCost(tenantId: string, itemId: string, targetUnitId: string): Promise<Decimal> {
  const recipes = await prisma.itemRecipe.findMany({
    where: { tenantId, parentItemId: itemId },
    include: { childItem: true },
  });

  if (recipes.length > 0) {
    let totalCost = new Decimal(0);

    for (const recipe of recipes) {
      const childCostPerRecipeUnit = await calculateItemCost(tenantId, recipe.childItemId, recipe.unitId);
      
      const costForThisChild = childCostPerRecipeUnit.mul(recipe.quantity);
      totalCost = totalCost.add(costForThisChild);
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return new Decimal(0);

    if (item.baseUnitId === targetUnitId) {
      return totalCost;
    }

    const converted = await convertUnit(tenantId, item.baseUnitId, targetUnitId, new Decimal(1));
    return totalCost.mul(converted.convertedQuantity);
  } else {
    
    const lastPurchase = await prisma.movementLedger.findFirst({
      where: {
        tenantId,
        itemId,
        movementType: "PURCHASE",
        direction: "IN",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!lastPurchase) {
      return new Decimal(0);
    }

    
    if (lastPurchase.unitId === targetUnitId) {
      return lastPurchase.unitCost;
    }

    const converted = await convertUnit(tenantId, targetUnitId, lastPurchase.unitId, new Decimal(1));
    return lastPurchase.unitCost.mul(converted.convertedQuantity);
  }
}
