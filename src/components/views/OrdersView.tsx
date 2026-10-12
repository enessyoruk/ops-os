import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "@/components/Modal";
import { getOrderStatusInfo, getAccountTypeInfo } from "@/lib/translations";

interface Props {
  tenantId: string;
}

type LineItem = { itemId: string; unitId: string; quantity: string; price: string };

export function OrdersView({ tenantId }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [selectedItems, setSelectedItems] = useState<LineItem[]>([]);

  const { data: orders, refetch } = trpc.orders.list.useQuery({ tenantId, page: 1, pageSize: 50 });
  const { data: accounts } = trpc.accounts.list.useQuery({ tenantId });
  const { data: items } = trpc.items.list.useQuery({ tenantId, page: 1, pageSize: 100 });

  const closeModal = () => {
    setShowAdd(false);
    setEditingOrderId(null);
    setAccountId("");
    setSelectedItems([]);
  };

  const createOrder = trpc.orders.createAndComplete.useMutation({ onSuccess: () => { refetch(); closeModal(); } });
  const updateOrder = trpc.orders.update.useMutation({ onSuccess: () => { refetch(); closeModal(); } });
  const cancelOrder = trpc.orders.cancel.useMutation({ onSuccess: () => refetch() });

  const isEditing = !!editingOrderId;
  const activeMutation = isEditing ? updateOrder : createOrder;

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { itemId: "", unitId: "", quantity: "1", price: "0" }]);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...selectedItems];
    const itemRef = newItems[index];
    (itemRef as any)[field] = value;

    if (field === "itemId" && value) {
      const it = items?.data.find(i => i.id === value);
      if (it) {
        itemRef.unitId = it.baseUnitId;
        itemRef.price = String(it.sellPrice || 0);
      }
    }

    setSelectedItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    setSelectedItems(newItems);
  };

  const handleEditClick = (order: any) => {
    setEditingOrderId(order.id);
    setAccountId(order.accountId);
    setSelectedItems(order.items.map((i: any) => ({
      itemId: i.itemId,
      unitId: i.unitId,
      quantity: String(i.quantity),
      price: String(i.unitPrice),
    })));
    setShowAdd(true);
  };

  const handleCancelClick = (order: any) => {
    if (order.status === "CANCELLED") return;
    if (!confirm(`${order.orderNumber} nolu sipariş iptal edilsin mi? Stok/finans hareketi ters kayıtla düzeltilecek.`)) return;
    cancelOrder.mutate({ tenantId, orderId: order.id });
  };

  const handleSubmit = () => {
    if (!accountId || selectedItems.length === 0) return;

    const formattedItems = selectedItems.map(i => ({
      itemId: i.itemId,
      unitId: i.unitId,
      quantity: Number(i.quantity),
      unitPrice: Number(i.price)
    }));

    if (isEditing) {
      updateOrder.mutate({
        tenantId,
        orderId: editingOrderId!,
        accountId,
        type: "SALES",
        status: "DRAFT",
        items: formattedItems,
      });
    } else {
      createOrder.mutate({
        tenantId,
        accountId,
        type: "SALES",
        status: "DRAFT", 
        items: formattedItems
      });
    }
  };

  const totalSalesAmount = selectedItems.reduce((acc, curr) => acc + (Number(curr.quantity) * Number(curr.price)), 0);

  return (
    <>
      <div className="view-content animation-fade-in">
        <div className="view-header">
          <h2 className="view-title">Sipariş & Satış Yönetimi</h2>
          <div className="view-actions">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Yeni Satış</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Sipariş No</th>
              <th>Müşteri / Cari</th>
              <th>Tarih</th>
              <th>Tutar</th>
              <th>Durum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(orders?.data || []).map((order: any) => {
              const statusInfo = getOrderStatusInfo(order.status);
              return (
                <tr key={order.id}>
                  <td className="bold mono">{order.orderNumber}</td>
                  <td>{order.account.name}</td>
                  <td className="mono">{new Date(order.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td className="mono bold" style={{ color: "var(--emerald)" }}>₺{Number(order.totalAmount).toLocaleString("tr-TR", {minimumFractionDigits: 2})}</td>
                  <td>
                    <span className={`badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {order.status === "COMPLETED" && (
                      <>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleEditClick(order)}>Düzenle</button>
                        <button className="btn btn-sm btn-danger" style={{ marginLeft: 6 }} onClick={() => handleCancelClick(order)} disabled={cancelOrder.isPending}>İptal Et</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {orders?.data?.length === 0 && (
              <tr><td colSpan={6} className="empty"><div className="empty-icon">🛒</div><div className="empty-text">Henüz sipariş/satış bulunmuyor</div></td></tr>
            )}
            {!orders?.data && (
              <tr><td colSpan={6} className="empty"><div className="empty-text">Sunucu bağlantısı bekleniyor... (Lütfen Next.js'i yeniden başlatın)</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* YENİ / DÜZENLE SATIŞ MODALI */}
      {showAdd && (
        <Modal open={showAdd} onClose={closeModal} title={isEditing ? "Satışı Düzenle" : "Yeni Satış Faturası"}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {isEditing && (
              <div style={{ fontSize: 12, color: "var(--text-2)", background: "var(--bg-1)", padding: "8px 12px", borderRadius: "8px", border: "1px dashed var(--border)" }}>
                Bu siparişi kaydettiğinde eski kayıt iptal edilip yerine güncel bilgilerle yeni bir sipariş oluşturulur (hareket defteri asla silinmez).
              </div>
            )}
            <div className="input-group">
              <label className="input-label">Müşteri / Cari Hesap Seçin</label>
              <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">Seçiniz...</option>
                {accounts?.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({getAccountTypeInfo(acc.type).label})</option>
                ))}
              </select>
            </div>

            <div style={{ background: "var(--bg-2)", padding: "16px", borderRadius: "8px", border: "1px dashed var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <label className="input-label" style={{ margin: 0 }}>Satılacak Ürünler</label>
                <button className="btn btn-sm btn-ghost" onClick={handleAddItem}>+ Kalem Ekle</button>
              </div>

              {selectedItems.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1.5fr auto", gap: "8px", marginBottom: "4px", fontSize: "12px", color: "var(--text-2)", paddingLeft: "4px" }}>
                  <div>Ürün Adı</div>
                  <div>Adet</div>
                  <div>Birim Fiyat</div>
                  <div>İşlem</div>
                </div>
              )}

              {selectedItems.map((item, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1.5fr auto", gap: "8px", marginBottom: "8px" }}>
                  <select className="input" value={item.itemId} onChange={e => handleItemChange(index, "itemId", e.target.value)}>
                    <option value="">Seç...</option>
                    {items?.data.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  <input type="number" className="input" placeholder="Miktar" value={item.quantity} onChange={e => handleItemChange(index, "quantity", e.target.value)} />
                  <input type="number" step="0.01" className="input" placeholder="Fiyat (₺)" value={item.price} onChange={e => handleItemChange(index, "price", e.target.value)} />
                  <button className="btn btn-sm btn-danger" style={{ padding: "0 8px" }} onClick={() => handleRemoveItem(index)}>Sil</button>
                </div>
              ))}

              {selectedItems.length === 0 && (
                <div style={{ fontSize: "13px", color: "var(--text-2)", textAlign: "center", padding: "10px" }}>Lütfen "Kalem Ekle" butonuna basarak ürün ekleyin.</div>
              )}

              {selectedItems.length > 0 && (
                <div style={{ textAlign: "right", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)", fontWeight: 700, fontSize: "16px" }}>
                  Genel Toplam: <span style={{ color: "var(--emerald)" }}>₺{totalSalesAmount.toLocaleString("tr-TR", {minimumFractionDigits: 2})}</span>
                </div>
              )}
            </div>

            {activeMutation.isError && (
              <div style={{ color: "var(--rose)", fontSize: "13px", padding: "8px", background: "rgba(244, 63, 94, 0.1)", borderRadius: "4px" }}>
                Hata: İşlem tamamlanamadı. ({activeMutation.error?.message})
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-ghost" onClick={closeModal}>İptal</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!accountId) return alert("Lütfen müşteri seçiniz.");
                  if (selectedItems.some(i => !i.itemId)) return alert("Lütfen eklediğiniz tüm satırlarda ürün seçiniz.");
                  handleSubmit();
                }}
                disabled={activeMutation.isPending || !accountId || selectedItems.length === 0}
              >
                {activeMutation.isPending ? "Kaydediliyor..." : isEditing ? "Değişiklikleri Kaydet" : "Satışı Tamamla"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
