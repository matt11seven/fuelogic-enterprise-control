import { Star } from "lucide-react";
import { OrderQuotation } from "@/services/orders-api";

interface QuotationsPanelProps {
  quotations: OrderQuotation[];
}

export function QuotationsPanel({ quotations }: QuotationsPanelProps) {
  if (quotations.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-500">Nenhuma cotação recebida ainda.</p>;
  }

  const cheapestId = quotations[0].id;

  return (
    <div className="space-y-2">
      {quotations.map((q) => (
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
                R$ {Number(q.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
