
import { z } from "zod";
import { router, tenantProcedure } from "@/server/trpc";
import { createMovementSchema } from "@/lib/validators";
import { createMovement, getMovements, type MovementType } from "@/server/services/ledger";

export const movementsRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        itemId: z.string().uuid().optional(),
        accountId: z.string().uuid().optional(),
        movementType: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      return getMovements(input.tenantId, {
        itemId: input.itemId,
        accountId: input.accountId,
        movementType: input.movementType as MovementType | undefined,
        startDate: input.startDate,
        endDate: input.endDate,
        page: input.page,
        pageSize: input.pageSize,
      });
    }),

  create: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid() }).merge(createMovementSchema))
    .mutation(async ({ input }) => {
      const { tenantId, ...data } = input;
      return createMovement({
        tenantId,
        ...data,
        quantity: data.quantity.toString(),
        unitCost: data.unitCost.toString(),
      });
    }),
});
