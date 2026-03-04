import { CheckCircle, Clock, Circle, Truck, XCircle } from "lucide-react";
import { OrderTimeline as TimelineItem } from "@/services/orders-api";

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string }> = {
  pending:    { icon: Clock,         color: "text-red-400" },
  quoted:     { icon: CheckCircle,   color: "text-amber-400" },
  approved:   { icon: CheckCircle,   color: "text-emerald-400" },
  delivering: { icon: Truck,         color: "text-blue-400" },
  delivered:  { icon: CheckCircle,   color: "text-slate-400" },
  cancelled:  { icon: XCircle,       color: "text-slate-500" },
};

interface OrderTimelineProps {
  timeline: TimelineItem[];
}

export function OrderTimeline({ timeline }: OrderTimelineProps) {
  if (timeline.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum evento registrado.</p>;
  }

  return (
    <div className="space-y-0">
      {timeline.map((entry, idx) => {
        const config = STATUS_CONFIG[entry.status] ?? { icon: Circle, color: "text-slate-400" };
        const Icon = config.icon;
        const isLast = idx === timeline.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
              {!isLast && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700/60 my-1" />}
            </div>
            <div className={`${isLast ? 'pb-0' : 'pb-3'}`}>
              <p className="text-sm text-slate-900 dark:text-slate-200 font-medium leading-snug">
                {entry.description}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(entry.created_at).toLocaleString('pt-BR')} · {entry.created_by}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
