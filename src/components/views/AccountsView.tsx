"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "@/components/Modal";
import { AccountStatementModal } from "@/components/views/AccountStatementModal";
import { getAccountTypeInfo } from "@/lib/translations";

export function AccountsView({ tenantId }: { tenantId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "CASH" as string, code: "" });

  const accounts = trpc.accounts.list.useQuery({ tenantId });
  const createAcc = trpc.accounts.create.useMutation({ onSuccess: () => { accounts.refetch(); setShowAdd(false); setForm({ name: "", type: "CASH", code: "" }); } });

  return (
    <>
      <div className="card anim-in">
        <div className="card-head"><h2 className="card-title">Hesaplar</h2>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Yeni Hesap</button></div>
        <table>
          <thead><tr><th>Kod</th><th>Ad</th><th>Tip</th><th>Bakiye</th></tr></thead>
          <tbody>
            {(accounts.data ?? []).map((a) => {
              const bal = Number((a as any).balance ?? 0);
              const typeInfo = getAccountTypeInfo(a.type);
              return (
                <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => setSelectedAccountId(a.id)}>
                  <td className="mono bold">{a.code ?? "—"}</td>
                  <td className="bold">{a.name}</td>
                  <td><span className={`badge ${typeInfo.cls}`}>{typeInfo.label}</span></td>
                  <td className="mono bold" style={{ color: bal > 0 ? "var(--emerald)" : bal < 0 ? "var(--rose)" : "var(--text-2)" }}>
                    {bal === 0 ? "—" : `₺${Math.abs(bal).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AccountStatementModal tenantId={tenantId} accountId={selectedAccountId} onClose={() => setSelectedAccountId(null)} />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Yeni Hesap">
        <div className="input-group"><label className="input-label">Hesap Adı *</label>
          <input className="input" placeholder="ör: Ana Kasa" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
        <div className="form-row">
          <div className="input-group"><label className="input-label">Tip *</label>
            <select className="input" value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
              <option value="CASH">Kasa</option><option value="BANK">Banka</option><option value="SUPPLIER">Tedarikçi</option><option value="CUSTOMER">Müşteri</option><option value="EXPENSE">Gider</option><option value="REVENUE">Gelir</option>
            </select></div>
          <div className="input-group"><label className="input-label">Hesap Kodu</label>
            <input className="input input-mono" placeholder="ör: 100" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} /></div>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>İptal</button>
          <button className="btn btn-primary" onClick={() => { if(form.name) createAcc.mutate({tenantId, name: form.name, type: form.type as "CASH", code: form.code||undefined}); }}>Kaydet</button>
        </div>
      </Modal>
    </>
  );
}
