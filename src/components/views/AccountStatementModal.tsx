"use client";
import { trpc } from "@/lib/trpc";
import { Modal } from "@/components/Modal";

interface Props {
  tenantId: string;
  accountId: string | null;
  onClose: () => void;
}

export function AccountStatementModal({ tenantId, accountId, onClose }: Props) {
  const { data } = trpc.accounts.getStatement.useQuery(
    { tenantId, accountId: accountId! },
    { enabled: !!accountId }
  );

  if (!accountId || !data) return null;

  const balanceNum = Number(data.finalBalance);
  const balanceLabel =
    data.account.type === "SUPPLIER"
      ? balanceNum > 0 ? "Alacaklı (Onlara borcumuz var)" : balanceNum < 0 ? "Borçlu (Bize borçlular)" : "Sıfır"
      : balanceNum > 0 ? "Borçlu (Bize borcu var)" : balanceNum < 0 ? "Alacaklı (Bizim borcumuz var)" : "Sıfır";

  return (
    <Modal open={!!accountId} onClose={onClose} title={`${data.account.name} — Cari Ekstre`}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            background: "var(--bg-3)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-2)" }}>Güncel Bakiye</div>
            <div style={{ fontSize: "13px", color: "var(--text-3)" }}>{balanceLabel}</div>
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "22px",
              color: balanceNum > 0 ? "var(--emerald)" : balanceNum < 0 ? "var(--rose)" : "var(--text-2)",
            }}
          >
            ₺{Math.abs(balanceNum).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Sipariş No</th>
              <th>Tip</th>
              <th>Borç</th>
              <th>Alacak</th>
              <th>Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{new Date(r.date).toLocaleDateString("tr-TR")}</td>
                <td className="mono">{r.orderNumber}</td>
                <td>
                  <span className={`badge ${r.type === "SALES" ? "b-emerald" : "b-amber"}`}>
                    {r.type === "SALES" ? "Satış" : "Alış"}
                  </span>
                </td>
                <td className="mono">{Number(r.debit) > 0 ? `₺${Number(r.debit).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}</td>
                <td className="mono">{Number(r.credit) > 0 ? `₺${Number(r.credit).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}</td>
                <td className="mono bold">₺{Number(r.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  <div className="empty-icon">📄</div>
                  <div className="empty-text">Bu hesaba ait tamamlanmış sipariş yok</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
