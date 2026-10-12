
import { z } from "zod";
import { router, tenantProcedure } from "@/server/trpc";
import { createUnitGroupSchema, createUnitSchema, createUnitConversionSchema } from "@/lib/validators";
import { convertUnit } from "@/lib/units";

export const unitsRouter = router({
  listGroups: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.unitGroup.findMany({
        where: { tenantId: input.tenantId },
        include: {
          units: { orderBy: { name: "asc" } },
        },
        orderBy: { name: "asc" },
      });
    }),

  createGroup: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid() }).merge(createUnitGroupSchema))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, ...data } = input;
      return ctx.prisma.unitGroup.create({ data: { tenantId, ...data } });
    }),

  createUnit: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid() }).merge(createUnitSchema))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, ...data } = input;
      return ctx.prisma.unit.create({ data: { tenantId, ...data } });
    }),

  createConversion: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid() }).merge(createUnitConversionSchema))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, ...data } = input;
      return ctx.prisma.unitConversion.create({
        data: { tenantId, fromUnitId: data.fromUnitId, toUnitId: data.toUnitId, factor: data.factor },
      });
    }),

  convert: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        fromUnitId: z.string().uuid(),
        toUnitId: z.string().uuid(),
        quantity: z.number().positive(),
      })
    )
    .query(async ({ input }) => {
      const result = await convertUnit(input.tenantId, input.fromUnitId, input.toUnitId, input.quantity);
      return {
        ...result,
        factor: result.factor.toString(),
        originalQuantity: result.originalQuantity.toString(),
        convertedQuantity: result.convertedQuantity.toString(),
      };
    }),

  listConversions: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.unitConversion.findMany({
        where: { tenantId: input.tenantId },
        include: {
          fromUnit: { select: { name: true, symbol: true } },
          toUnit: { select: { name: true, symbol: true } },
        },
      });
    }),
});
