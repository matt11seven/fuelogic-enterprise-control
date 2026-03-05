import { OrderStatus } from "@/services/orders-api";

const STATUS_CONFIG: Record<OrderStatus, { label: string; dot: string; className: string }> = {
  pending:    { label: "Pendente",    dot: "bg-red-500",    className: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-400/40" },
  quoted:     { label: "Em Cotação",  dot: "bg-amber-400",  className: "bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/40" },
  approved:   { label: "Aprovado",   dot: "bg-emerald-500", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40" },
  delivering: { label: "Em Entrega", dot: "bg-blue-500",    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-400/40" },
  delivered:  { label: "Entregue",   dot: "bg-slate-400",   className: "bg-slate-400/15 text-slate-600 dark:text-slate-400 border border-slate-400/40" },
  cancelled:  { label: "Cancelado",  dot: "bg-slate-400",   className: "bg-slate-300/20 text-slate-500 dark:text-slate-500 border border-slate-400/20" },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      {config.label}
    </span>
  );
}
