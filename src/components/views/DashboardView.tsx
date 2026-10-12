"use client";
import { trpc } from "@/lib/trpc";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { getMovementTypeInfo } from "@/lib/translations";

function AnimatedStat({ label, value, sub, icon, cls, currency }: { label: string; value: number; sub: string; icon: string; cls: string; currency?: boolean }) {
  const display = useAnimatedNumber(value);
  return (
    <div className="stat-card anim-in">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className={`stat-icon ${cls}`}>{icon}</div>
      </div>
      <div className="stat-val">{currency ? `₺${display.toLocaleString("tr-TR")}` : display}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

export function DashboardView({ tenantId }: { tenantId: string }) {
  const items = trpc.items.list.useQuery({ tenantId, page: 1, pageSize: 10 });
  const movements = trpc.movements.list.useQuery({ tenantId, page: 1, pageSize: 5 });
  const units = trpc.units.listGroups.useQuery({ tenantId });
  const accounts = trpc.accounts.list.useQuery({ tenantId });
  const orders = trpc.orders.list.useQuery({ tenantId, type: "SALES", page: 1, pageSize: 1 });
  const orderStats = trpc.orders.stats.useQuery({ tenantId });

  const totalItems = items.data?.pagination.total ?? 0;
  const totalMov = movements.data?.pagination.total ?? 0;
  const totalUnits = (units.data ?? []).reduce((s, g) => s + g.units.length, 0);
  const totalAcc = accounts.data?.length ?? 0;
  const totalOrders = orders.data?.pagination.total ?? 0;
  const movList = movements.data?.data ?? [];
  const totalRevenue = Number(orderStats.data?.totalRevenue ?? 0);
  const totalProfit = Number(orderStats.data?.totalProfit ?? 0);

  return (
    <>
      <div className="stats">
        <AnimatedStat label="Toplam Gelir" value={totalRevenue} sub="Tamamlanan satışlar" icon="💰" cls="i-emerald" currency />
        <AnimatedStat label="Toplam Kâr" value={totalProfit} sub="Satış - Maliyet" icon="📈" cls="i-blue" currency />
        <AnimatedStat label="Satışlar" value={totalOrders} sub="Toplam Sipariş" icon="🛒" cls="i-rose" />
        <AnimatedStat label="Ürünler" value={totalItems} sub="Aktif kayıt" icon="📦" cls="i-amber" />
        <AnimatedStat label="Hareketler" value={totalMov} sub="Stok/finans" icon="📋" cls="i-violet" />
        <AnimatedStat label="Hesaplar" value={totalAcc} sub="Müşteri/Tedarikçi" icon="🏦" cls="i-amber" />
      </div>

      <div className="card anim-in">
        <div className="card-head"><h2 className="card-title">Son Hareketler</h2></div>
        <table>
          <thead><tr><th>Tarih</th><th>Tip</th><th>Yön</th><th>Ürün</th><th>Miktar</th><th>Tutar</th></tr></thead>
          <tbody>
            {movList.map((m) => {
              const typeInfo = getMovementTypeInfo(m.movementType);
              return (
                <tr key={m.id}>
                  <td className="mono">{new Date(m.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td><span className={`badge ${typeInfo.cls}`}>{typeInfo.label}</span></td>
                  <td><span className={`badge ${m.direction === "IN" ? "b-emerald" : "b-rose"}`}>{m.direction === "IN" ? "↑ Giriş" : "↓ Çıkış"}</span></td>
                  <td>{m.item?.name ?? "—"}</td>
                  <td className="mono">{Number(m.quantity).toLocaleString("tr-TR")} {m.unit?.symbol}</td>
                  <td className="mono bold">₺{Number(m.totalAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
            {movList.length === 0 && <tr><td colSpan={6} className="empty"><div className="empty-icon">📋</div><div className="empty-text">Henüz hareket yok</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
