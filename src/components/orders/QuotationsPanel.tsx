import { useState } from "react";
import { Star } from "lucide-react";
import { OrderQuotation } from "@/services/orders-api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface QuotationsPanelProps {
  quotations: OrderQuotation[];
  allowManual?: boolean;
  onAddManual?: (payload: {
    supplier_name: string;
    product_type: string;
    unit_price: number;
    total_price: number;
    delivery_days: number;
    notes?: string;
  }) => Promise<void>;
  productType?: string;
  quantity?: number;
}

export function QuotationsPanel({
  quotations,
  allowManual = false,
  onAddManual,
  productType = "",
  quantity = 0,
}: QuotationsPanelProps) {
  const [supplierName, setSupplierName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!onAddManual || !supplierName || !unitPrice) return;
    const unit = Number(unitPrice);
    const total = Number(quantity || 0) * unit;

    setIsSaving(true);
    try {
      await onAddManual({
        supplier_name: supplierName,
        product_type: productType,
        unit_price: unit,
        total_price: total,
        delivery_days: Number(deliveryDays || 0),
        notes: notes || undefined,
      });
      setSupplierName("");
      setUnitPrice("");
      setDeliveryDays("");
      setNotes("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {quotations.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-500">Nenhuma cotacao recebida ainda.</p>
      )}

      {quotations.length > 0 &&
        quotations.map((q) => {
          const cheapestId = quotations[0]?.id;
          return (
            <div
              key={q.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                q.id === cheapestId
                  ? "bg-emerald-500/10 border-emerald-500/40 dark:bg-emerald-500/10 dark:border-emerald-500/40"
                  : "bg-white/50 dark:bg-white/5 border-white/20 dark:border-white/10"
              }`}
            >
              <div className="flex items-center gap-2">
                {q.id === cheapestId && <Star className="w-3.5 h-3.5 text-emerald-500" />}
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{q.supplier_name}</p>
                  {q.delivery_days != null && (
                    <p className="text-xs text-slate-500">{q.delivery_days}d de entrega</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-200">
                  R$ {Number(q.unit_price).toFixed(4)}/L
                </p>
                {q.total_price != null && (
                  <p className="text-xs text-slate-500">
                    R$ {Number(q.total_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          );
        })}

      {allowManual && onAddManual && (
        <div className="mt-3 rounded-lg border p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registrar cotacao manual</p>
          <Input placeholder="Fornecedor" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.0001"
              placeholder="Preco unitario (R$/L)"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Prazo (dias)"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
            />
          </div>
          <Input placeholder="Observacoes (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button size="sm" onClick={handleAdd} disabled={isSaving || !supplierName || !unitPrice}>
            {isSaving ? "Salvando..." : "Adicionar cotacao"}
          </Button>
        </div>
      )}
    </div>
  );
}
