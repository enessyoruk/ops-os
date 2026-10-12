
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure } from "@/server/trpc";
import { createOrderSchema } from "@/lib/validators";
import { createMovement } from "@/server/services/ledger";
import { calculateItemCost } from "@/lib/cost-engine";
import Decimal from "decimal.js";
import type { Context } from "@/server/trpc";

async function createAndCompleteOrder(
  ctx: Context,
  input: { tenantId: string; accountId: string; type: "SALES" | "PURCHASE"; notes?: string; items: { itemId: string; quantity: number; unitId: string; unitPrice: number }[] },
  metadata: Record<string, unknown> = {}
) {
  const { tenantId, accountId, type, notes, items } = input;

  const orderCount = await ctx.prisma.order.count({ where: { tenantId } });
  const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, "0")}`;

  let totalAmount = new Decimal(0);

  const orderItemsData = await Promise.all(
    items.map(async (itemInput) => {
      const qty = new Decimal(itemInput.quantity);
      const price = new Decimal(itemInput.unitPrice);
      const lineTotal = qty.times(price);
      totalAmount = totalAmount.plus(lineTotal);

      const cost = await calculateItemCost(tenantId, itemInput.itemId, itemInput.unitId);

      return {
        tenantId,
        itemId: itemInput.itemId,
        quantity: qty,
        unitId: itemInput.unitId,
        unitPrice: price,
        totalPrice: lineTotal,
        unitCost: cost,
      };
    })
  );

  const order = await ctx.prisma.order.create({
    data: {
      tenantId,
      accountId,
      type,
      status: "DRAFT",
      orderNumber,
      notes,
      totalAmount,
      metadata,
      items: { create: orderItemsData },
    },
    include: { items: true },
  });

  for (const item of order.items) {
    const movementType = type === "SALES" ? "SALE" : "PURCHASE";
    const direction = type === "SALES" ? "OUT" : "IN";

    await createMovement({
      tenantId,
      itemId: item.itemId,
      accountId,
      movementType,
      direction,
      quantity: Number(item.quantity),
      unitId: item.unitId,
      unitCost: Number(item.unitCost || 0),
      referenceId: order.id,
      referenceType: "ORDER",
      description: `${order.orderNumber} nolu sipariş işlemi`,
    });
  }

  await ctx.prisma.order.update({
    where: { id: order.id },
    data: { status: "COMPLETED" },
  });

  return { success: true, orderId: order.id, orderNumber };
}

async function cancelOrder(ctx: Context, tenantId: string, orderId: string, reasonNote: string) {
  const order = await ctx.prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true },
  });

  if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Sipariş bulunamadı." });
  if (order.status === "CANCELLED") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Sipariş zaten iptal edilmiş." });
  }

  for (const item of order.items) {
    const direction = order.type === "SALES" ? "IN" : "OUT"; 
    await createMovement({
      tenantId,
      itemId: item.itemId,
      accountId: order.accountId,
      movementType: "RETURN",
      direction,
      quantity: Number(item.quantity),
      unitId: item.unitId,
      unitCost: Number(item.unitCost || 0),
      referenceId: order.id,
      referenceType: "ORDER_CANCEL",
      description: `${order.orderNumber} nolu sipariş iptali${reasonNote ? ` (${reasonNote})` : ""}`,
    });
  }

  await ctx.prisma.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });

  return order;
}

export const ordersRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        type: z.enum(["SALES", "PURCHASE"]).optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const { tenantId, type, page, pageSize } = input;
      const skip = (page - 1) * pageSize;

      const where = {
        tenantId,
        ...(type && { type }),
      };

      const [orders, total] = await Promise.all([
        ctx.prisma.order.findMany({
          where,
          include: {
            account: { select: { name: true, code: true, type: true } },
            items: {
              include: {
                item: { select: { name: true, sku: true } },
                unit: { select: { symbol: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        ctx.prisma.order.count({ where }),
      ]);

      const serializedOrders = orders.map(order => ({
        ...order,
        totalAmount: order.totalAmount.toString(),
        items: order.items.map(i => ({
          ...i,
          quantity: i.quantity.toString(),
          unitPrice: i.unitPrice.toString(),
          totalPrice: i.totalPrice.toString(),
          unitCost: i.unitCost?.toString() || null,
        }))
      }));

      return {
        data: serializedOrders,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    }),

  createAndComplete: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid() }).merge(createOrderSchema))
    .mutation(async ({ input, ctx }) => {
      return createAndCompleteOrder(ctx, input);
    }),

  cancel: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid(), orderId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await cancelOrder(ctx, input.tenantId, input.orderId, "");
      return { success: true };
    }),

  update: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid(), orderId: z.string().uuid() }).merge(createOrderSchema))
    .mutation(async ({ input, ctx }) => {
      const { orderId, tenantId, ...rest } = input;

      const original = await ctx.prisma.order.findFirst({ where: { id: orderId, tenantId } });
      if (!original) throw new TRPCError({ code: "NOT_FOUND", message: "Sipariş bulunamadı." });
      if (original.status === "CANCELLED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "İptal edilmiş sipariş düzenlenemez." });
      }

      await cancelOrder(ctx, tenantId, orderId, "düzenleme");

      return createAndCompleteOrder(ctx, { tenantId, ...rest }, { revisionOf: orderId, previousOrderNumber: original.orderNumber });
    }),

  stats: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const orders = await ctx.prisma.order.findMany({
        where: { tenantId: input.tenantId, type: "SALES", status: "COMPLETED" },
        include: { items: true },
      });

      let totalRevenue = new Decimal(0);
      let totalProfit = new Decimal(0);

      for (const order of orders) {
        totalRevenue = totalRevenue.plus(order.totalAmount);
        for (const item of order.items) {
          const cost = new Decimal(item.unitCost ?? 0).times(item.quantity);
          totalProfit = totalProfit.plus(new Decimal(item.totalPrice).minus(cost));
        }
      }

      return {
        totalRevenue: totalRevenue.toString(),
        totalProfit: totalProfit.toString(),
      };
    }),
});
