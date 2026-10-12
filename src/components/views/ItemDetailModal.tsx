import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Modal } from "@/components/Modal";
import { getAccountTypeInfo } from "@/lib/translations";

interface Props {
  tenantId: string;
  itemId: string | null;
  onClose: () => void;
}

export function ItemDetailModal({ tenantId, itemId, onClose }: Props) {
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitId, setUnitId] = useState("");
  const [produceMode, setProduceMode] = useState(false);
  const [produceQty, setProduceQty] = useState("");
  const [produceAccountId, setProduceAccountId] = useState("");

  const { data: item } = trpc.items.getById.useQuery(
    { tenantId, id: itemId! },
    { enabled: !!itemId }
  );

  const { data: recipes, refetch: refetchRecipes } = trpc.recipes.getByParent.useQuery(
    { tenantId, parentItemId: itemId! },
    { enabled: !!itemId }
  );

  const { data: cost, refetch: refetchCost } = trpc.recipes.getRealTimeCost.useQuery(
    { tenantId, itemId: itemId!, targetUnitId: item?.baseUnitId! },
    { enabled: !!item?.baseUnitId }
  );

  const { data: allItems } = trpc.items.list.useQuery({ tenantId, page: 1, pageSize: 100 });
  const { data: unitGroups } = trpc.units.listGroups.useQuery({ tenantId });
  const { data: accounts } = trpc.accounts.list.useQuery({ tenantId });
  const allUnits = (unitGroups ?? []).flatMap(g => g.units);

  const addIngredient = trpc.recipes.addIngredient.useMutation({
    onSuccess: () => {
      refetchRecipes();
      refetchCost();
      setIngredientId("");
      setQuantity("");
      setUnitId("");
    }
  });

  const removeIngredient = trpc.recipes.removeIngredient.useMutation({
    onSuccess: () => {
      refetchRecipes();
      refetchCost();
    }
  });

  const utils = trpc.useUtils();
  const produceItem = trpc.production.produceItem.useMutation({
    onSuccess: () => {
      utils.items.getById.invalidate({ tenantId, id: itemId! });
      utils.items.list.invalidate();
      setProduceMode(false);
      setProduceQty("");
    }
  });

  const updateItem = trpc.items.update.useMutation({
    onSuccess: () => {
      utils.items.getById.invalidate({ tenantId, id: itemId! });
      utils.items.list.invalidate();
    }
  });

  if (!item) return null;
  const itemSellPrice = (item?.metadata as any)?.sellPrice || 0;

  return (
    <Modal open={!!itemId} onClose={onClose} title={`${item.name} Detayları`}>
      <div style={{ display: "flex", gap: "24px", flexDirection: "column" }}>
        
        {/* Özet Kartı */}
        <div style={{ background: "var(--bg-3)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-2)" }}>Temel Birim</div>
            <div style={{ fontWeight: 600 }}>{item.baseUnit.name} ({item.baseUnit.symbol})</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-2)" }}>Mevcut Stok</div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: 700, fontSize: "18px", color: "var(--emerald)" }}>{item.currentStock} {item.baseUnit.symbol}</span>
              {(item.type === "PRODUCT" || item.type === "SEMI_FINISHED") && (
                <button 
                  className="btn btn-sm btn-ghost" 
                  style={{ padding: "4px 8px", fontSize: "11px" }}
                  onClick={() => setProduceMode(!produceMode)}
                >
                  {produceMode ? "İptal" : "⚙️ Üret"}
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "24px", textAlign: "right" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>Satış Fiyatı</div>
              <div style={{ display: "flex", alignItems: "center", position: "relative", gap: "6px" }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "8px", top: "6px", color: "var(--text-2)", fontSize: "14px" }}>₺</span>
                  <input 
                    key={`price-${item.id}`}
                    className="input input-mono" 
                    style={{ width: "95px", padding: "4px 8px 4px 20px", fontSize: "16px", fontWeight: 700, background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "6px" }} 
                    type="number"
                    step="0.01"
                    defaultValue={itemSellPrice}
                    id="sell-price-input"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = Number((e.target as HTMLInputElement).value);
                        let meta = {};
                        if (typeof item.metadata === "string") { try { meta = JSON.parse(item.metadata); } catch(err){} }
                        else if (typeof item.metadata === "object" && item.metadata !== null) { meta = item.metadata; }
                        updateItem.mutate({ tenantId, id: item.id, metadata: { ...meta, sellPrice: val } });
                      }
                    }}
                    disabled={updateItem.isPending}
                  />
                </div>
                <button 
                  className="btn btn-sm btn-primary"
                  style={{ padding: "4px 8px" }}
                  disabled={updateItem.isPending}
                  onClick={() => {
                    const input = document.getElementById("sell-price-input") as HTMLInputElement;
                    if (input) {
                      const val = Number(input.value);
                      let meta = {};
                      if (typeof item.metadata === "string") { try { meta = JSON.parse(item.metadata); } catch(err){} }
                      else if (typeof item.metadata === "object" && item.metadata !== null) { meta = item.metadata; }
                      updateItem.mutate({ tenantId, id: item.id, metadata: { ...meta, sellPrice: val } });
                    }
                  }}
                >
                  {updateItem.isPending ? "..." : "Kaydet"}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>Gerçek Zamanlı Maliyet</div>
              <div style={{ fontWeight: 700, fontSize: "20px", color: "var(--violet)", background: "var(--indigo-dim)", padding: "4px 12px", borderRadius: "8px" }}>
                {cost ? `₺${Number(cost).toFixed(2)}` : "Hesaplanıyor..."}
              </div>
            </div>
          </div>
        </div>

        {/* Üretim Modu Formu */}
        {produceMode && (
          <div style={{ background: "var(--bg-1)", padding: "16px", borderRadius: "12px", border: "1px dashed var(--indigo)", animation: "modalIn 0.3s ease" }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "var(--indigo)" }}>Hızlı Üretim Emri</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "10px", alignItems: "center" }}>
              <input 
                type="number" 
                className="input" 
                placeholder={`Üretilecek Miktar (${item.baseUnit.symbol})`}
                value={produceQty}
                onChange={e => setProduceQty(e.target.value)}
              />
              <select className="input" value={produceAccountId} onChange={e => setProduceAccountId(e.target.value)}>
                <option value="">Depo / Finans Hesabı Seçiniz...</option>
                {accounts?.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({getAccountTypeInfo(acc.type).label})</option>
                ))}
              </select>
              <button 
                className="btn btn-primary"
                disabled={!produceQty || !produceAccountId || produceItem.isPending}
                onClick={() => produceItem.mutate({
                  tenantId,
                  itemId: item.id,
                  quantity: Number(produceQty),
                  unitId: item.baseUnitId,
                  accountId: produceAccountId
                })}
              >
                {produceItem.isPending ? "Üretiliyor..." : "Üretimi Tamamla"}
              </button>
            </div>
          </div>
        )}

        {/* Reçete Alanı (Sadece Ürün ve Yarı Mamullerde) */}
        {(item.type === "PRODUCT" || item.type === "SEMI_FINISHED") && (
          <div>
            <h3 style={{ fontSize: "15px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🧪</span> Reçete (BOM)
            </h3>
            
            {/* Reçete Ekleme Formu */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", marginBottom: "16px", background: "var(--bg-1)", padding: "12px", borderRadius: "10px", border: "1px dashed var(--border)" }}>
              <select className="input" value={ingredientId} onChange={e => setIngredientId(e.target.value)}>
                <option value="">Hammadde Seç...</option>
                {allItems?.data.filter(i => i.id !== item.id).map(i => (
                  <option key={i.id} value={i.id}>{i.name} (Stok: {i.baseUnit.symbol})</option>
                ))}
              </select>
              <input type="number" className="input" placeholder="Miktar" value={quantity} onChange={e => setQuantity(e.target.value)} />
              <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)}>
                <option value="">Birim...</option>
                {allUnits.map(u => <option key={u.id} value={u.id}>{u.symbol}</option>)}
              </select>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => addIngredient.mutate({ tenantId, parentItemId: item.id, childItemId: ingredientId, quantity: Number(quantity), unitId })}
                disabled={!ingredientId || !quantity || !unitId || addIngredient.isPending}
              >
                Ekle
              </button>
            </div>

            {/* Reçete Listesi */}
            {recipes && recipes.length > 0 ? (
              <table style={{ background: "var(--bg-2)", borderRadius: "8px", overflow: "hidden" }}>
                <thead><tr><th>Hammadde</th><th>Kullanım Miktarı</th><th></th></tr></thead>
                <tbody>
                  {recipes.map(r => (
                    <tr key={r.id}>
                      <td className="bold">{r.childItem.name} <span className="mono" style={{fontSize: "10px", marginLeft:"8px"}}>{r.childItem.sku}</span></td>
                      <td className="mono">{Number(r.quantity)} {r.unit.symbol}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-sm btn-danger" onClick={() => removeIngredient.mutate({ tenantId, id: r.id })}>Sil</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty" style={{ padding: "20px" }}>
                <div className="empty-text">Bu ürün için henüz reçete oluşturulmamış. Eğer reçete yoksa, maliyeti direkt alış faturalarından alınır.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
