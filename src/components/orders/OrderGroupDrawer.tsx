import { ArrowRight, Droplets, Layers, X } from "lucide-react";
import { OrderItem } from "@/services/orders-api";

interface OrderGroupDrawerProps {
  orders: OrderItem[];
  onClose: () => void;
  onSelectOrder: (order: OrderItem) => void;
}

export function OrderGroupDrawer({ orders, onClose, onSelectOrder }: OrderGroupDrawerProps) {
  if (orders.length === 0) return null;

  const groupId = orders[0].group_id;
  const createdAt = new Date(orders[0].created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalVolume = orders.reduce((acc, o) => acc + Number(o.quantity || 0), 0);
  const stations = [...new Set(orders.map((o) => o.station_name))];

  const volumeByProduct = orders.reduce<Record<string, number>>((acc, o) => {
    const qty = Number(o.quantity || 0);
    acc[o.product_type] = (acc[o.product_type] ?? 0) + qty;
    return acc;
  }, {});
  const productEntries = Object.entries(volumeByProduct).sort((a, b) => b[1] - a[1]);
  const multiProduct = productEntries.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md h-full overflow-y-auto flex flex-col shadow-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Solicitação</span>
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                #{groupId.slice(-8).toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{createdAt}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4">

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Tanques", value: orders.length },
              { label: "Postos", value: stations.length },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                  {label}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {/* Total a ser pedido */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700/80 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <Droplets className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                Total a ser pedido
              </h3>
            </div>
            <div className="px-4 py-3 bg-white dark:bg-slate-900 space-y-2.5">
              {productEntries.map(([product, volume]) => (
                <div key={product} className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate">
                    {product}
                  </span>
                  <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                    {volume.toLocaleString("pt-BR")} L
                  </span>
                </div>
              ))}

              {multiProduct && (
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Total
                  </span>
                  <span className="text-base font-bold text-orange-500 dark:text-orange-400 tabular-nums">
                    {totalVolume.toLocaleString("pt-BR")} L
                  </span>
                </div>
              )}

              {!multiProduct && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Total
                  </span>
                  <span className="text-base font-bold text-orange-500 dark:text-orange-400 tabular-nums">
                    {totalVolume.toLocaleString("pt-BR")} L
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Lista de tanques */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500 mb-1.5">
              Tanques desta solicitação
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectOrder(order);
                  }}
                  className="w-full text-left flex items-center justify-between gap-3 py-2.5 rounded-lg px-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 leading-snug line-clamp-1">
                      {order.station_name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight line-clamp-1 mt-0.5">
                      {order.product_type}
                      {order.tank_id && <span> · {order.tank_id}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                      {Number(order.quantity).toLocaleString("pt-BR")} L
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-orange-400 dark:group-hover:text-orange-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
