
import { z } from "zod";
import { router, tenantProcedure } from "@/server/trpc";
import { createItemSchema, updateItemSchema } from "@/lib/validators";
import { getItemStock } from "@/lib/units";
import { calculateItemCost } from "@/lib/cost-engine";
import Decimal from "decimal.js";

export const itemsRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        type: z.enum(["PRODUCT", "RAW_MATERIAL", "SEMI_FINISHED", "SERVICE"]).optional(),
        search: z.string().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const { tenantId, type, search, page, pageSize } = input;
      const skip = (page - 1) * pageSize;

      const where = {
        tenantId,
        isActive: true,
        ...(type && { type }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            { barcode: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.prisma.item.findMany({
          where,
          include: {
            baseUnit: { select: { name: true, symbol: true } },
            itemUnits: { include: { unit: { select: { name: true, symbol: true } } } },
          },
          orderBy: { name: "asc" },
          skip,
          take: pageSize,
        }),
        ctx.prisma.item.count({ where }),
      ]);

      const itemsWithCost = await Promise.all(
        items.map(async (item) => {
          const cost = await calculateItemCost(tenantId, item.id, item.baseUnitId);
          return {
            ...item,
            cost: cost.toString(),
            sellPrice: (item.metadata as any)?.sellPrice || 0,
          };
        })
      );

      return {
        data: itemsWithCost,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    }),

  getById: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const item = await ctx.prisma.item.findFirst({
        where: { id: input.id, tenantId: input.tenantId, isActive: true },
        include: {
          baseUnit: true,
          itemUnits: { include: { unit: true } },
          movements: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { unit: { select: { name: true, symbol: true } } },
          },
        },
      });

      if (!item) throw new Error("Ürün bulunamadı");

      const stock = await getItemStock(input.tenantId, item.id, item.baseUnitId);

      return { ...item, currentStock: stock.toString() };
    }),

  create: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid() }).merge(createItemSchema))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, ...data } = input;
      return ctx.prisma.item.create({
        data: { tenantId, ...data },
        include: { baseUnit: { select: { name: true, symbol: true } } },
      });
    }),

  update: tenantProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      id: z.string().uuid(),
      name: z.string().optional(),
      sku: z.string().optional(),
      barcode: z.string().optional(),
      type: z.enum(["PRODUCT", "RAW_MATERIAL", "SEMI_FINISHED", "SERVICE"]).optional(),
      baseUnitId: z.string().uuid().optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, id, ...data } = input;
      return ctx.prisma.item.update({
        where: { id },
        data,
      });
    }),

  deactivate: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.item.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),
});
