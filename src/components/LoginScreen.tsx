"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="login-wrap dark">
      {}
      <div 
        className="login-bg-image hdr-animated"
        style={{ backgroundImage: `url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)` }}
      />
      <div className="login-bg-overlay"></div>

      <div className="login-card">
        {}
        <div className="login-logo-container">
          <svg className="venola-logo-svg" viewBox="0 0 120 120" width="100" height="100">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#7e22ce" />
              </linearGradient>
              <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <linearGradient id="grad3" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#db2777" />
              </linearGradient>
              <linearGradient id="grad4" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#4c1d95" />
              </linearGradient>
              <filter id="crystal-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <g filter="url(#crystal-glow)">
              <polygon points="15,25 45,85 55,65 35,25" fill="url(#grad2)" opacity="0.8" />
              <polygon points="105,25 75,85 65,65 85,25" fill="url(#grad1)" opacity="0.8" />
              <polygon points="25,20 60,95 65,70 45,20" fill="url(#grad4)" />
              <polygon points="95,20 60,95 55,70 75,20" fill="url(#grad3)" />
              <polygon points="60,95 45,20 75,20 60,40" fill="rgba(255,255,255,0.15)" />
              <polygon points="60,40 45,20 25,20" fill="rgba(255,255,255,0.05)" />
              <polygon points="60,40 75,20 95,20" fill="rgba(255,255,255,0.25)" />
            </g>
          </svg>
        </div>
        
        <h1 className="login-h1 brand-venola">Venola</h1>
        <p className="login-sub">Yeni Nesil İşletim Sistemi</p>
        
        {error && <div style={{ color: "#f43f5e", marginBottom: 16, fontSize: 13, background: "rgba(244,63,94,0.1)", padding: "8px", borderRadius: "8px" }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", transform: "translateZ(10px)", width: "100%" }}>
          <input
            type="email"
            className="input"
            style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
            placeholder="E-posta adresi"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <input
            type="password"
            className="input"
            style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <button
            className="btn btn-primary btn-glow"
            onClick={handleLogin}
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: "8px", background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", border: "none" }}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </div>
        
        <p className="login-hint">demo bilgileri: admin@demo.com / demo1234</p>
      </div>
    </div>
  );
}
