"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function UnitsView({ tenantId }: { tenantId: string }) {
  const [calcFrom, setCalcFrom] = useState("");
  const [calcTo, setCalcTo] = useState("");
  const [calcQty, setCalcQty] = useState("1");

  const groups = trpc.units.listGroups.useQuery({ tenantId });
  const conversions = trpc.units.listConversions.useQuery({ tenantId });
  const calcResult = trpc.units.convert.useQuery(
    { tenantId, fromUnitId: calcFrom, toUnitId: calcTo, quantity: Number(calcQty) || 1 },
    { enabled: !!calcFrom && !!calcTo && calcFrom !== calcTo }
  );

  const allUnits = (groups.data ?? []).flatMap(g => g.units);

  return (
    <div className="flex-col gap-md" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Birim Dönüşüm Hesaplayıcı */}
      <div className="card anim-in">
        <div className="card-head">
          <h2 className="card-title">Birim Dönüşüm Hesaplayıcı</h2>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="input-group" style={{ flex: 1, minWidth: 120 }}>
              <label className="input-label">Miktar</label>
              <input className="input input-mono" type="number" value={calcQty} onChange={(e) => setCalcQty(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
              <label className="input-label">Kaynak Birim</label>
              <select className="input" value={calcFrom} onChange={(e) => setCalcFrom(e.target.value)}>
                <option value="">Seçin...</option>
                {allUnits.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              </select>
            </div>
            <div style={{ padding: "10px 0", fontSize: 20, color: "var(--text-3)" }}>→</div>
            <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
              <label className="input-label">Hedef Birim</label>
              <select className="input" value={calcTo} onChange={(e) => setCalcTo(e.target.value)}>
                <option value="">Seçin...</option>
                {allUnits.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              {calcResult.data && (
                <div style={{ padding: 12, background: "var(--indigo-dim)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                  <div className="mono bold" style={{ fontSize: 22, color: "var(--indigo)" }}>
                    {Number(calcResult.data.convertedQuantity).toLocaleString("tr-TR", { maximumFractionDigits: 4 })}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                    Yol: {calcResult.data.path.join(" → ")}
                  </div>
                </div>
              )}
              {calcResult.error && <div style={{ color: "var(--rose)", fontSize: 12 }}>Dönüşüm bulunamadı</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Birim Grupları */}
      {(groups.data ?? []).map((group) => (
        <div key={group.id} className="card anim-in">
          <div className="card-head">
            <h3 className="card-title">{group.name}</h3>
            {group.description && <span style={{ fontSize: 12, color: "var(--text-3)" }}>{group.description}</span>}
          </div>
          <div className="card-body">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {group.units.map((unit) => (
                <span key={unit.id} className={`badge ${unit.isBase ? "b-blue" : "b-emerald"}`} style={{ padding: "8px 16px", fontSize: 13 }}>
                  {unit.name} ({unit.symbol}) {unit.isBase && "★"}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Dönüşüm Tablosu */}
      <div className="card anim-in">
        <div className="card-head">
          <h2 className="card-title">Tanımlı Dönüşümler</h2>
        </div>
        <table>
          <thead><tr><th>Kaynak</th><th>Hedef</th><th>Faktör</th></tr></thead>
          <tbody>
            {(conversions.data ?? []).map((c) => (
              <tr key={c.id}>
                <td className="bold">{c.fromUnit.name} ({c.fromUnit.symbol})</td>
                <td className="bold">{c.toUnit.name} ({c.toUnit.symbol})</td>
                <td className="mono" style={{ color: "var(--indigo)" }}>×{Number(c.factor).toLocaleString("tr-TR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
