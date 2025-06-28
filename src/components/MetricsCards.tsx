
import { AlertTriangle, TrendingUp, CheckCircle, Droplet } from "lucide-react";
import { Station } from "@/hooks/use-tank-data";
import { useConfig } from "@/context/ConfigContext";

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
  bgGradient: string;
  borderColor: string;
  glowClass: string;
}

interface MetricsCardsProps {
  stations?: Station[];
}

const MetricCard = ({ title, value, icon: Icon, color, bgGradient, borderColor, glowClass }: MetricCardProps) => (
  <div className={`metric-card border-l-4 ${borderColor} ${glowClass} ${bgGradient}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-900 dark:text-slate-400 text-sm font-semibold uppercase tracking-wide">{title}</p>
        <p className={`text-4xl font-bold ${color} text-shadow`}>{value}</p>
      </div>
      <div className={`p-4 rounded-xl ${color === 'text-red-400' ? 'bg-red-500/20' : color === 'text-amber-400' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
        <Icon className={`w-12 h-12 ${color}`} />
      </div>
    </div>
  </div>
);

const MetricsCards = ({ stations = [] }: MetricsCardsProps) => {
  // Obter os thresholds configurados do contexto global
  const { thresholds } = useConfig();
  
  // Calcular a quantidade de tanques em cada status
  let alertaCount = 0;
  let criticoCount = 0;
  let atencaoCount = 0;
  let operacionalCount = 0;
  
  // Percorrer todos os tanques de todas as estações
  stations.forEach(station => {
    station.tanks.forEach(tank => {
      const percentage = (tank.current / tank.capacity) * 100;
      
      if (tank.waterAmount > 0) {
        // Tanques com água têm prioridade como Alerta
        alertaCount++;
      } else if (percentage < thresholds.threshold_critico) {
        // Tanques abaixo do threshold crítico
        criticoCount++;
      } else if (percentage < thresholds.threshold_atencao) {
        // Tanques entre threshold crítico e de atenção
        atencaoCount++;
      } else {
        // Tanques acima do threshold de atenção estão operacionais
        operacionalCount++;
      }
    });
  });

  const metrics = [
    {
      title: "Críticos",
      value: criticoCount,
      icon: AlertTriangle,
      color: "text-red-400",
      bgGradient: "bg-gradient-to-br from-red-900/20 to-red-800/10",
      borderColor: "border-red-500",
      glowClass: "glow-red"
    },
    {
      title: "Atenção", 
      value: atencaoCount,
      icon: TrendingUp,
      color: "text-amber-400",
      bgGradient: "bg-gradient-to-br from-amber-900/20 to-amber-800/10",
      borderColor: "border-amber-500",
      glowClass: "glow-amber"
    },
    {
      title: "Operacionais",
      value: operacionalCount,
      icon: CheckCircle,
      color: "text-emerald-400",
      bgGradient: "bg-gradient-to-br from-emerald-900/20 to-emerald-800/10",
      borderColor: "border-emerald-500",
      glowClass: "glow-emerald"
    },
    {
      title: "Alerta",
      value: alertaCount,
      icon: Droplet,
      color: "text-blue-400",
      bgGradient: "bg-gradient-to-br from-blue-900/30 to-blue-800/20",
      borderColor: "border-blue-400",
      glowClass: "glow-blue"
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
