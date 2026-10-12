
import { z } from "zod";
import { router, tenantProcedure } from "@/server/trpc";
import { calculateItemCost } from "@/lib/cost-engine";

export const recipesRouter = router({
  getByParent: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid(), parentItemId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        const recipes = await ctx.prisma.itemRecipe.findMany({
          where: { tenantId: input.tenantId, parentItemId: input.parentItemId },
          include: {
            childItem: { select: { name: true, sku: true } },
            unit: { select: { name: true, symbol: true } },
          },
        });
        return recipes.map(r => ({ ...r, quantity: r.quantity.toString() }));
      } catch (err) {
        console.error("GET_BY_PARENT ERROR:", err);
        throw err;
      }
    }),

  getRealTimeCost: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid(), itemId: z.string().uuid(), targetUnitId: z.string().uuid() }))
    .query(async ({ input }) => {
      const cost = await calculateItemCost(input.tenantId, input.itemId, input.targetUnitId);
      return cost.toString();
    }),

  addIngredient: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        parentItemId: z.string().uuid(),
        childItemId: z.string().uuid(),
        quantity: z.number().positive(),
        unitId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { tenantId, parentItemId, childItemId, quantity, unitId } = input;
      
      const existing = await ctx.prisma.itemRecipe.findFirst({
        where: { tenantId, parentItemId, childItemId },
      });

      if (existing) {
        return ctx.prisma.itemRecipe.update({
          where: { id: existing.id },
          data: { quantity: Number(existing.quantity) + quantity, unitId },
        });
      }

      return ctx.prisma.itemRecipe.create({
        data: {
          tenantId,
          parentItemId,
          childItemId,
          quantity,
          unitId,
        },
      });
    }),

  removeIngredient: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.itemRecipe.delete({
        where: { id: input.id, tenantId: input.tenantId },
      });
    }),
});
