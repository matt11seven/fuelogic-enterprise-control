
import { AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
  bgGradient: string;
  borderColor: string;
  glowClass: string;
}

const MetricCard = ({ title, value, icon: Icon, color, bgGradient, borderColor, glowClass }: MetricCardProps) => (
  <div className={`metric-card border-l-4 ${borderColor} ${glowClass} ${bgGradient}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide">{title}</p>
        <p className={`text-4xl font-bold ${color} text-shadow`}>{value}</p>
      </div>
      <div className={`p-4 rounded-xl ${color === 'text-red-400' ? 'bg-red-500/20' : color === 'text-amber-400' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
        <Icon className={`w-12 h-12 ${color}`} />
      </div>
    </div>
  </div>
);

const MetricsCards = () => {
  const metrics = [
    {
      title: "Críticos",
      value: 3,
      icon: AlertTriangle,
      color: "text-red-400",
      bgGradient: "bg-gradient-to-br from-red-900/20 to-red-800/10",
      borderColor: "border-red-500",
      glowClass: "glow-red"
    },
    {
      title: "Atenção", 
      value: 7,
      icon: TrendingUp,
      color: "text-amber-400",
      bgGradient: "bg-gradient-to-br from-amber-900/20 to-amber-800/10",
      borderColor: "border-amber-500",
      glowClass: "glow-amber"
    },
    {
      title: "Operacionais",
      value: 24,
      icon: CheckCircle,
      color: "text-emerald-400",
      bgGradient: "bg-gradient-to-br from-emerald-900/20 to-emerald-800/10",
      borderColor: "border-emerald-500",
      glowClass: "glow-emerald"
    },
    {
      title: "Ordem Ativa",
      value: 1,
      icon: TrendingUp,
      color: "text-emerald-400",
      bgGradient: "bg-gradient-to-br from-emerald-900/30 to-emerald-800/20",
      borderColor: "border-emerald-400",
      glowClass: "glow-emerald"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
};

export default MetricsCards;
