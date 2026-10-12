"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { LoginScreen } from "@/components/LoginScreen";
import { Sidebar } from "@/components/Sidebar";
import { DashboardView } from "@/components/views/DashboardView";
import { ItemsView } from "@/components/views/ItemsView";
import { MovementsView } from "@/components/views/MovementsView";
import { AccountsView } from "@/components/views/AccountsView";
import { UnitsView } from "@/components/views/UnitsView";
import { OrdersView } from "@/components/views/OrdersView";

const VIEW_TITLES: Record<string, string> = {
  dashboard: "Genel Bakış", orders: "Siparişler", items: "Ürünler", movements: "Hareket Defteri",
  accounts: "Hesaplar", units: "Birimler & Dönüşümler",
};

export default function Page() {
  const { data: session, status } = useSession();
  const [view, setView] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  if (status === "loading") return <div style={{ height: "100vh", background: "#05060a" }}></div>;
  if (!session?.user?.tenantId) return <LoginScreen />;

  const tenantId = session.user.tenantId;

  return (
    <div className="app">
      <Sidebar active={view} onNavigate={setView} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className={`main${collapsed ? " shifted" : ""}`}>
        <header className="topbar">
          <h1 className="topbar-title">{VIEW_TITLES[view]}</h1>
          <div className="topbar-right">
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Aydınlık mod" : "Karanlık mod"}
            >
              <div className={`theme-dot${theme === "light" ? " light" : ""}`}>
                {theme === "dark" ? "🌙" : "☀️"}
              </div>
            </button>
            <button className="btn-logout" onClick={() => signOut()} title="Çıkış Yap">
              <span className="logout-icon">⏻</span>
              <span className="logout-text">Çıkış</span>
            </button>
          </div>
        </header>
        <div className="page" key={view}>
          {view === "dashboard" && <DashboardView tenantId={tenantId} />}
          {view === "orders" && <OrdersView tenantId={tenantId} />}
          {view === "items" && <ItemsView tenantId={tenantId} />}
          {view === "movements" && <MovementsView tenantId={tenantId} />}
          {view === "accounts" && <AccountsView tenantId={tenantId} />}
          {view === "units" && <UnitsView tenantId={tenantId} />}
        </div>
      </main>
    </div>
  );
}
