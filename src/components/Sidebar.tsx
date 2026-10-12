"use client";

const MAIN_NAV = [
  { key: "dashboard", icon: "📊", label: "Genel Bakış" },
  { key: "orders", icon: "🛒", label: "Siparişler" },
  { key: "items", icon: "📦", label: "Ürünler" },
  { key: "movements", icon: "📋", label: "Hareketler" },
  { key: "accounts", icon: "🏦", label: "Hesaplar" },
];

const SETTINGS_NAV = [
  { key: "units", icon: "📐", label: "Birimler" },
];

interface Props {
  active: string;
  onNavigate: (v: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ active, onNavigate, collapsed, onToggle }: Props) {
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-head">
        <div className="logo-mark">
          <svg viewBox="0 0 120 120" width="28" height="28">
            <g>
              <polygon points="15,25 45,85 55,65 35,25" fill="#60a5fa" opacity="0.8" />
              <polygon points="105,25 75,85 65,65 85,25" fill="#c084fc" opacity="0.8" />
              <polygon points="25,20 60,95 65,70 45,20" fill="#a78bfa" />
              <polygon points="95,20 60,95 55,70 75,20" fill="#f472b6" />
              <polygon points="60,95 45,20 75,20 60,40" fill="rgba(255,255,255,0.4)" />
              <polygon points="60,40 45,20 25,20" fill="rgba(255,255,255,0.2)" />
              <polygon points="60,40 75,20 95,20" fill="rgba(255,255,255,0.5)" />
            </g>
          </svg>
        </div>
        {!collapsed && <span className="logo-text">Venola</span>}
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          {MAIN_NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-btn${active === n.key ? " on" : ""}`}
              onClick={() => onNavigate(n.key)}
              title={collapsed ? n.label : undefined}
            >
              <span className="nav-icon">{n.icon}</span>
              {!collapsed && <span className="nav-text">{n.label}</span>}
            </button>
          ))}
        </div>
        <div className="nav-group">
          {SETTINGS_NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-btn${active === n.key ? " on" : ""}`}
              onClick={() => onNavigate(n.key)}
              title={collapsed ? n.label : undefined}
            >
              <span className="nav-icon">{n.icon}</span>
              {!collapsed && <span className="nav-text">{n.label}</span>}
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar-toggle">
        <button className="toggle-btn" onClick={onToggle} title={collapsed ? "Genişlet" : "Daralt"}>
          <span className="toggle-arrow">{collapsed ? "»" : "«"}</span>
          {!collapsed && <span className="toggle-label">Daralt</span>}
        </button>
      </div>
    </aside>
  );
}
