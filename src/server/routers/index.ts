
import { router } from "@/server/trpc";
import { itemsRouter } from "@/server/routers/items";
import { unitsRouter } from "@/server/routers/units";
import { movementsRouter } from "@/server/routers/movements";
import { accountsRouter } from "@/server/routers/accounts";
import { recipesRouter } from "@/server/routers/recipes";
import { productionRouter } from "@/server/routers/production";
import { ordersRouter } from "@/server/routers/orders";

export const appRouter = router({
  items: itemsRouter,
  units: unitsRouter,
  movements: movementsRouter,
  accounts: accountsRouter,
  recipes: recipesRouter,
  production: productionRouter,
  orders: ordersRouter,
});

export type AppRouter = typeof appRouter;
