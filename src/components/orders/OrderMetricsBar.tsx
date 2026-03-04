import { Clock, Package, CheckCircle, Droplets } from "lucide-react";
import { OrderStats } from "@/services/orders-api";

interface OrderMetricsBarProps {
  stats: OrderStats | null;
  isLoading: boolean;
}

export function OrderMetricsBar({ stats, isLoading }: OrderMetricsBarProps) {
  const metrics = [
    {
      label: "Pendente",
      value: stats?.pending ?? 0,
      icon: Clock,
      color: "text-red-400",
      bgGradient: "bg-gradient-to-r from-red-50 to-rose-50 dark:from-[#300] dark:to-red-950/30",
      borderColor: "border-red-400",
      glowClass: "glow-red",
    },
    {
      label: "Em Cotação",
      value: stats?.quoted ?? 0,
      icon: Package,
      color: "text-amber-400",
      bgGradient: "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-[#3a2a00] dark:to-amber-950/30",
      borderColor: "border-amber-400",
      glowClass: "glow-amber",
    },
    {
      label: "Aprovado",
      value: stats?.approved ?? 0,
      icon: CheckCircle,
      color: "text-emerald-400",
      bgGradient: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-[#092a1f] dark:to-emerald-950/30",
      borderColor: "border-emerald-400",
      glowClass: "glow-emerald",
    },
    {
      label: "Vol. Total",
      value: stats ? `${Number(stats.total_volume).toLocaleString('pt-BR')} L` : "0 L",
      icon: Droplets,
      color: "text-blue-400",
      bgGradient: "bg-gradient-to-r from-blue-50 to-sky-50 dark:from-[#00164d]/80 dark:to-blue-950/30",
      borderColor: "border-blue-400",
      glowClass: "glow-blue",
      isVolume: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className={`metric-card border-l-4 ${m.borderColor} ${m.glowClass} ${m.bgGradient}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-900 dark:text-slate-400 text-sm font-semibold uppercase tracking-wide">
                  {m.label}
                </p>
                <p className={`text-4xl font-bold ${m.color} text-shadow`}>
                  {isLoading ? "..." : m.isVolume ? (
                    <span className="text-2xl">{m.value}</span>
                  ) : m.value}
                </p>
              </div>
              <div className={`p-4 rounded-xl ${
                m.color === 'text-red-400' ? 'bg-red-500/20' :
                m.color === 'text-amber-400' ? 'bg-amber-500/20' :
                m.color === 'text-blue-400' ? 'bg-blue-500/20' :
                'bg-emerald-500/20'
              }`}>
                <Icon className={`w-12 h-12 ${m.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
