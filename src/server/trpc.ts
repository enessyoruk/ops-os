
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { prisma } from "@/server/db";
import { validateTenant, type TenantContext } from "@/server/middleware/tenant";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export interface Context {
  prisma: typeof prisma;
  session: Awaited<ReturnType<typeof getServerSession>> | null;
  tenant?: TenantContext;
}

export const createContext = async (): Promise<Context> => {
  const session = await getServerSession(authOptions);
  return { prisma, session };
};

const t = initTRPC.context<Context>().create({
  transformer: superjson, 
  errorFormatter({ shape, error }) {
    console.error("TRPC ERROR:", error.name, error.message);
    if (error.cause) {
      console.error("TRPC CAUSE:", error.cause);
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const tenantProcedure = t.procedure
  .input(z.object({ tenantId: z.string().uuid() }))
  .use(async ({ input, ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Giriş yapmanız gerekiyor." });
    }
    
    if (ctx.session.user.tenantId !== input.tenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Bu işletme için yetkiniz yok." });
    }

    const tenant = await validateTenant(input.tenantId);

    return next({
      ctx: {
        ...ctx,
        tenant: {
          tenantId: input.tenantId,
          enabledModules: tenant.enabledModules,
        },
      },
    });
  });
