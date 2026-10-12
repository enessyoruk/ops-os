import { z } from "zod";
import { router, tenantProcedure } from "../trpc";
import { calculateItemCost } from "@/lib/cost-engine";
import { createMovement } from "@/server/services/ledger";
import { TRPCError } from "@trpc/server";

export const productionRouter = router({
  produceItem: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        itemId: z.string().uuid(),
        quantity: z.number().positive(),
        unitId: z.string().uuid(),
        accountId: z.string().uuid(), 
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { tenantId, itemId, quantity, unitId, accountId } = input;

      const recipes = await ctx.prisma.itemRecipe.findMany({
        where: { tenantId, parentItemId: itemId },
      });

      if (recipes.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bu ürünün reçetesi bulunmuyor, üretim yapılamaz.",
        });
      }

      for (const recipe of recipes) {
        const requiredQty = Number(recipe.quantity) * quantity;
        
        await createMovement({
          tenantId,
          itemId: recipe.childItemId,
          accountId,
          movementType: "PRODUCTION",
          direction: "OUT",
          quantity: requiredQty,
          unitId: recipe.unitId,
          unitCost: 0, 
          referenceType: "PRODUCTION_OUT",
          referenceId: itemId,
          description: `Üretim için kullanım (Ürün ID: ${itemId})`
        });
      }

      const unitCostDecimal = await calculateItemCost(tenantId, itemId, unitId);
      const unitCost = unitCostDecimal.toNumber();

      await createMovement({
        tenantId,
        itemId: itemId,
        accountId,
        movementType: "PRODUCTION_IN",
        direction: "IN",
        quantity: quantity,
        unitId: unitId,
        unitCost: unitCost,
        referenceType: "PRODUCTION_IN",
        referenceId: itemId,
        description: "Üretim Girişi"
      });

      return { success: true, unitCost, totalCost: unitCost * quantity };
    }),
});
