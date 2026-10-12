"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "@/components/Modal";
import { ItemDetailModal } from "./ItemDetailModal";
import { getItemTypeInfo } from "@/lib/translations";

export function ItemsView({ tenantId }: { tenantId: string }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", barcode: "", type: "PRODUCT" as const, baseUnitId: "", sellPrice: "" });

  const items = trpc.items.list.useQuery({ tenantId, page: 1, pageSize: 50, search: search || undefined });
  const unitGroups = trpc.units.listGroups.useQuery({ tenantId });
  const createItem = trpc.items.create.useMutation({ onSuccess: () => { items.refetch(); setShowAdd(false); resetForm(); } });
  const deactivate = trpc.items.deactivate.useMutation({ onSuccess: () => items.refetch() });

  const allUnits = (unitGroups.data ?? []).flatMap(g => g.units);
  function resetForm() { setForm({ name: "", sku: "", barcode: "", type: "PRODUCT", baseUnitId: "", sellPrice: "" }); }
  function handleSubmit() {
    if (!form.name || !form.baseUnitId) return;
    const metadata = form.sellPrice ? { sellPrice: Number(form.sellPrice) } : undefined;
    createItem.mutate({ tenantId, ...form, sku: form.sku || undefined, barcode: form.barcode || undefined, metadata });
  }
  const data = items.data?.data ?? [];

  return (
    <>
      <div className="card anim-in">
        <div className="card-head">
          <div className="flex items-center gap-md">
            <h2 className="card-title">Ürün Listesi</h2>
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input className="input" placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Yeni Ürün</button>
        </div>
        <table>
          <thead><tr><th>Ad</th><th>Tip</th><th>Satış Fiyatı</th><th>Maliyet</th><th>Marj (%)</th><th>Birim</th><th></th></tr></thead>
          <tbody>
            {data.map((item: any) => {
              const cost = Number(item.cost);
              const sellPrice = Number(item.sellPrice);
              const margin = sellPrice > 0 ? ((sellPrice - cost) / sellPrice) * 100 : 0;
              const marginColor = margin > 30 ? "var(--emerald)" : margin > 0 ? "var(--amber)" : "var(--rose)";
              
              return (
                <tr key={item.id} style={{ cursor: "pointer" }} onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== "BUTTON") setSelectedItemId(item.id);
                }}>
                  <td className="bold">{item.name}</td>
                  <td><span className={`badge ${getItemTypeInfo(item.type).cls}`}>
                    {getItemTypeInfo(item.type).label}
                  </span></td>
                  <td className="mono bold">₺{sellPrice.toLocaleString("tr-TR",{minimumFractionDigits:2})}</td>
                  <td className="mono">₺{cost.toLocaleString("tr-TR",{minimumFractionDigits:2})}</td>
                  <td className="mono bold" style={{ color: cost === 0 && sellPrice === 0 ? "var(--text-2)" : marginColor }}>
                    {cost === 0 && sellPrice === 0 ? "—" : `%${margin.toFixed(1)}`}
                  </td>
                  <td>{item.baseUnit.symbol}</td>
                  <td style={{textAlign: "right"}}><button className="btn btn-sm btn-danger" onClick={() => deactivate.mutate({ tenantId, id: item.id })}>Sil</button></td>
                </tr>
              );
            })}
            {data.length === 0 && <tr><td colSpan={7} className="empty"><div className="empty-icon">📦</div><div className="empty-text">Ürün bulunamadı</div></td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Yeni Ürün Ekle">
        <div className="input-group">
          <label className="input-label">Ürün Adı *</label>
          <input className="input" placeholder="ör: Coca-Cola 330ml" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="input-group">
            <label className="input-label">SKU</label>
            <input className="input input-mono" placeholder="ör: KOLA-330" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Barkod</label>
            <input className="input input-mono" placeholder="ör: 8690000000001" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="input-group">
            <label className="input-label">Tip *</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
              <option value="PRODUCT">Ürün</option><option value="RAW_MATERIAL">Hammadde</option>
              <option value="SEMI_FINISHED">Yarı Mamul</option><option value="SERVICE">Hizmet</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Temel Birim *</label>
            <select className="input" value={form.baseUnitId} onChange={(e) => setForm({ ...form, baseUnitId: e.target.value })}>
              <option value="">Seçin...</option>
              {allUnits.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
            </select>
          </div>
        </div>
        <div className="input-group" style={{ marginBottom: "16px" }}>
          <label className="input-label">Satış Fiyatı (₺)</label>
          <input className="input input-mono" type="number" placeholder="0.00" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} />
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>İptal</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={createItem.isPending}>
            {createItem.isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </Modal>

      <ItemDetailModal 
        tenantId={tenantId} 
        itemId={selectedItemId} 
        onClose={() => setSelectedItemId(null)} 
      />
    </>
  );
}
