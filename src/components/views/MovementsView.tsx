"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "@/components/Modal";
import { getMovementTypeInfo } from "@/lib/translations";

export function MovementsView({ tenantId }: { tenantId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ itemId: "", accountId: "", movementType: "PURCHASE", direction: "IN" as "IN"|"OUT", quantity: "", unitId: "", unitCost: "", description: "" });

  const movements = trpc.movements.list.useQuery({ tenantId, page: 1, pageSize: 50, movementType: filter || undefined });
  const items = trpc.items.list.useQuery({ tenantId, page: 1, pageSize: 100 });
  const accounts = trpc.accounts.list.useQuery({ tenantId });
  const unitGroups = trpc.units.listGroups.useQuery({ tenantId });
  const createMov = trpc.movements.create.useMutation({ onSuccess: () => { movements.refetch(); setShowAdd(false); resetForm(); } });

  const allUnits = (unitGroups.data ?? []).flatMap(g => g.units);
  const movList = movements.data?.data ?? [];
  function resetForm() { setForm({ itemId: "", accountId: "", movementType: "PURCHASE", direction: "IN", quantity: "", unitId: "", unitCost: "", description: "" }); }
  function handleSubmit() {
    if (!form.quantity || !form.unitId || !form.unitCost) return;
    createMov.mutate({ tenantId, movementType: form.movementType as "PURCHASE", direction: form.direction, quantity: Number(form.quantity), unitId: form.unitId, unitCost: Number(form.unitCost), itemId: form.itemId || undefined, accountId: form.accountId || undefined, description: form.description || undefined });
  }

  return (
    <>
      <div className="card anim-in">
        <div className="card-head">
          <div className="flex items-center gap-md">
            <h2 className="card-title">Hareket Defteri</h2>
            <select className="input" style={{ width: 160, padding: "6px 12px", fontSize: 12 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Tüm Tipler</option>
              <option value="PURCHASE">Alış</option>
              <option value="SALE">Satış</option>
              <option value="PRODUCTION_IN">Üretim Girişi</option>
              <option value="PRODUCTION">Üretim Çıkışı</option>
              <option value="RETURN">İade</option>
              <option value="ADJUSTMENT">Düzeltme</option>
              <option value="WASTE">Fire</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Yeni Hareket</button>
        </div>
        <table>
          <thead><tr><th>Tarih</th><th>Tip</th><th>Yön</th><th>Ürün</th><th>Hesap</th><th>Miktar</th><th>B.Maliyet</th><th>Toplam</th><th>Açıklama</th></tr></thead>
          <tbody>
            {movList.map((m) => {
              const typeInfo = getMovementTypeInfo(m.movementType);
              return (
                <tr key={m.id}>
                  <td className="mono">{new Date(m.createdAt).toLocaleString("tr-TR",{dateStyle:"short",timeStyle:"short"})}</td>
                  <td><span className={`badge ${typeInfo.cls}`}>{typeInfo.label}</span></td>
                  <td><span className={`badge ${m.direction==="IN"?"b-emerald":"b-rose"}`}>{m.direction==="IN"?"↑ Giriş":"↓ Çıkış"}</span></td>
                  <td>{m.item?.name??"—"}</td><td>{m.account?.name??"—"}</td>
                  <td className="mono">{Number(m.quantity).toLocaleString("tr-TR")} {m.unit?.symbol}</td>
                  <td className="mono">₺{Number(m.unitCost).toLocaleString("tr-TR")}</td>
                  <td className="mono bold">₺{Number(m.totalAmount).toLocaleString("tr-TR",{minimumFractionDigits:2})}</td>
                  <td style={{maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.description??"—"}</td>
                </tr>
              );
            })}
            {movList.length===0&&<tr><td colSpan={9} className="empty"><div className="empty-icon">📋</div><div className="empty-text">Hareket bulunamadı</div></td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Yeni Hareket Kaydet">
        <div className="form-row">
          <div className="input-group"><label className="input-label">Hareket Tipi *</label>
            <select className="input" value={form.movementType} onChange={(e) => setForm({...form, movementType: e.target.value})}>
              <option value="PURCHASE">Alış</option>
              <option value="SALE">Satış</option>
              <option value="PRODUCTION_IN">Üretim Girişi</option>
              <option value="PRODUCTION">Üretim Çıkışı</option>
              <option value="RETURN">İade</option>
              <option value="ADJUSTMENT">Düzeltme</option>
              <option value="WASTE">Fire</option>
              <option value="TRANSFER">Transfer</option>
            </select></div>
          <div className="input-group"><label className="input-label">Yön *</label>
            <select className="input" value={form.direction} onChange={(e) => setForm({...form, direction: e.target.value as "IN"|"OUT"})}>
              <option value="IN">Giriş</option>
              <option value="OUT">Çıkış</option>
            </select></div>
        </div>
        <div className="form-row">
          <div className="input-group"><label className="input-label">Ürün</label>
            <select className="input" value={form.itemId} onChange={(e) => setForm({...form, itemId: e.target.value})}>
              <option value="">Seçin...</option>{(items.data?.data??[]).map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
            </select></div>
          <div className="input-group"><label className="input-label">Hesap</label>
            <select className="input" value={form.accountId} onChange={(e) => setForm({...form, accountId: e.target.value})}>
              <option value="">Seçin...</option>{(accounts.data??[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select></div>
        </div>
        <div className="form-row">
          <div className="input-group"><label className="input-label">Miktar *</label>
            <input className="input input-mono" type="number" step="0.01" placeholder="0.00" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} /></div>
          <div className="input-group"><label className="input-label">Birim *</label>
            <select className="input" value={form.unitId} onChange={(e) => setForm({...form, unitId: e.target.value})}>
              <option value="">Seçin...</option>{allUnits.map(u=><option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
            </select></div>
        </div>
        <div className="input-group"><label className="input-label">Birim Maliyet (₺) *</label>
          <input className="input input-mono" type="number" step="0.01" placeholder="0.00" value={form.unitCost} onChange={(e) => setForm({...form, unitCost: e.target.value})} /></div>
        <div className="input-group"><label className="input-label">Açıklama</label>
          <input className="input" placeholder="ör: 10 koli kola alışı" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
        {createMov.error&&<p style={{color:"var(--rose)",fontSize:13}}>Hata: {createMov.error.message}</p>}
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>İptal</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={createMov.isPending}>{createMov.isPending?"Kaydediliyor...":"Kaydet"}</button>
        </div>
      </Modal>
    </>
  );
}
