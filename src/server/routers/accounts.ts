
import { z } from "zod";
import { router, tenantProcedure } from "@/server/trpc";
import { createAccountSchema } from "@/lib/validators";
import Decimal from "decimal.js";

export const accountsRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        type: z.enum(["CASH", "BANK", "SUPPLIER", "CUSTOMER", "EXPENSE", "REVENUE"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: {
          tenantId: input.tenantId,
          isActive: true,
          ...(input.type && { type: input.type }),
        },
        orderBy: { code: "asc" },
      });

      const withBalance = await Promise.all(
        accounts.map(async (acc) => {
          const orders = await ctx.prisma.order.findMany({
            where: { tenantId: input.tenantId, accountId: acc.id, status: "COMPLETED" },
            select: { type: true, totalAmount: true },
          });
          let balance = new Decimal(0);
          for (const o of orders) {
            balance = o.type === "SALES" ? balance.plus(o.totalAmount) : balance.minus(o.totalAmount);
          }
          return { ...acc, balance: balance.toString() };
        })
      );

      return withBalance;
    }),

  getStatement: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid(), accountId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const account = await ctx.prisma.account.findFirst({
        where: { id: input.accountId, tenantId: input.tenantId },
      });
      if (!account) throw new Error("Hesap bulunamadı");

      const orders = await ctx.prisma.order.findMany({
        where: { tenantId: input.tenantId, accountId: input.accountId, status: "COMPLETED" },
        orderBy: { createdAt: "asc" },
        include: { items: true },
      });

      let balance = new Decimal(0);
      const rows = orders.map((order) => {
        const amount = new Decimal(order.totalAmount.toString());
        const debit = order.type === "SALES" ? amount : new Decimal(0);
        const credit = order.type === "PURCHASE" ? amount : new Decimal(0);
        balance = balance.plus(debit).minus(credit);
        return {
          id: order.id,
          date: order.createdAt,
          orderNumber: order.orderNumber,
          type: order.type,
          itemCount: order.items.length,
          notes: order.notes,
          debit: debit.toString(),
          credit: credit.toString(),
          balance: balance.toString(),
        };
      });

      return {
        account: { id: account.id, name: account.name, type: account.type, code: account.code },
        rows,
        finalBalance: balance.toString(),
      };
    }),

  create: tenantProcedure
    .input(z.object({ tenantId: z.string().uuid() }).merge(createAccountSchema))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, ...data } = input;
      return ctx.prisma.account.create({ data: { tenantId, ...data } });
    }),
});
