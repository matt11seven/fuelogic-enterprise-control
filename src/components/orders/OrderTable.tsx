import { ExternalLink } from "lucide-react";
import { OrderItem } from "@/services/orders-api";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface OrderTableProps {
  orders: OrderItem[];
  isLoading: boolean;
  onSelect: (order: OrderItem) => void;
}

export function OrderTable({ orders, isLoading, onSelect }: OrderTableProps) {
  if (isLoading) {
    return (
      <div className="p-10 text-center text-slate-900 dark:text-slate-400 text-sm">
        Carregando pedidos...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-10 text-center text-slate-900 dark:text-slate-500 text-sm">
        Nenhum pedido encontrado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 dark:border-white/10">
            <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wide text-slate-900 dark:text-slate-400">#</th>
            <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wide text-slate-900 dark:text-slate-400">Posto</th>
            <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wide text-slate-900 dark:text-slate-400">Produto</th>
            <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wide text-slate-900 dark:text-slate-400">Volume</th>
            <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wide text-slate-900 dark:text-slate-400">Status</th>
            <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wide text-slate-900 dark:text-slate-400">Data</th>
            <th className="px-5 py-3 text-center font-semibold text-xs uppercase tracking-wide text-slate-900 dark:text-slate-400">Ver</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-white/5 dark:border-white/5 hover:bg-emerald-500/5 dark:hover:bg-white/5 transition-colors"
            >
              <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{order.id}</td>
              <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-200">{order.station_name}</td>
              <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{order.product_type}</td>
              <td className="px-5 py-3.5 text-right font-mono text-slate-900 dark:text-slate-200">
                {Number(order.quantity).toLocaleString('pt-BR')} L
              </td>
              <td className="px-5 py-3.5">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="px-5 py-3.5 text-slate-500 text-xs">
                {new Date(order.created_at).toLocaleDateString('pt-BR')}
              </td>
              <td className="px-5 py-3.5 text-center">
                <button
                  onClick={() => onSelect(order)}
                  className="p-1.5 rounded-lg glass-card-hover border border-white/10 text-slate-400 hover:text-emerald-500 transition-colors"
                  title="Ver detalhes"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
