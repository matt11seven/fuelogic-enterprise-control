
import { AlertTriangle, TrendingUp, CheckCircle, Droplet } from "lucide-react";
import { Station } from "@/hooks/use-tank-data";
import { useConfig } from "@/context/ConfigContext";
import { useState } from "react";
import InspectionAlertDialog from "@/components/InspectionAlertDialog";
import { useToast } from "@/components/ui/use-toast";

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
  bgGradient: string;
  borderColor: string;
  glowClass: string;
  onClick?: () => void;
}

interface MetricsCardsProps {
  stations?: Station[];
}

interface TanqueAgua {
  id: string;
  stationName: string;
  code: string;
  product: string;
  waterAmount: number;
  capacity: number;
  current: number;
}

const MetricCard = ({ title, value, icon: Icon, color, bgGradient, borderColor, glowClass, onClick }: MetricCardProps) => (
  <div 
    className={`metric-card border-l-4 ${borderColor} ${glowClass} ${bgGradient} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow duration-300' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-900 dark:text-slate-400 text-sm font-semibold uppercase tracking-wide">{title}</p>
        <p className={`text-4xl font-bold ${color} text-shadow`}>{value}</p>
      </div>
      <div className={`p-4 rounded-xl ${color === 'text-red-400' ? 'bg-red-500/20' : color === 'text-amber-400' ? 'bg-amber-500/20' : color === 'text-blue-400' ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
        <Icon className={`w-12 h-12 ${color}`} />
      </div>
    </div>
  </div>
);

const MetricsCards = ({ stations = [] }: MetricsCardsProps) => {
  // Obter os thresholds configurados do contexto global
  const { thresholds } = useConfig();
  const { toast } = useToast();
  
  // Estados para o diálogo de alerta de inspeção
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  
  // Lista de tanques com água
  const [tanquesComAgua, setTanquesComAgua] = useState<TanqueAgua[]>([]);
  
  // Calcular a quantidade de tanques em cada status
  let alertaCount = 0;
  let criticoCount = 0;
  let atencaoCount = 0;
  let operacionalCount = 0;
  
  // Lista de tanques com água para enviar alertas
  const tanquesAgua: any[] = [];
  
  // Percorrer todos os tanques de todas as estações
  stations.forEach(station => {
    station.tanks.forEach(tank => {
      const percentage = (tank.current / tank.capacity) * 100;
      
      if (tank.waterAmount > 0) {
        // Tanques com água têm prioridade como Alerta
        alertaCount++;
        
        // Adicionar à lista de tanques com água
        tanquesAgua.push({
          id: tank.id,
          stationName: station.name,
          code: tank.name,
          product: tank.product,
          waterAmount: tank.waterAmount,
          capacity: tank.capacity,
          current: tank.current
        });
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

  // Handler para abrir o diálogo de alerta de inspeção
  const handleOpenInspectionDialog = () => {
    if (tanquesAgua.length === 0) {
      toast({
        title: "Sem tanques com água",
        description: "Não existem tanques com alerta de água para enviar.",
      });
      return;
    }
    
    setTanquesComAgua(tanquesAgua);
    setIsAlertDialogOpen(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <MetricCard
        title="Alerta de Água"
        value={alertaCount}
        icon={Droplet}
        color="text-blue-400"
        bgGradient="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-[#00164d]/80 dark:to-blue-950/30"
        borderColor="border-blue-400"
        glowClass="glow-blue-100"
        onClick={handleOpenInspectionDialog}
      />
      <MetricCard
        title="Crítico"
        value={criticoCount}
        icon={AlertTriangle}
        color="text-red-400"
        bgGradient="bg-gradient-to-r from-red-50 to-rose-50 dark:from-[#300] dark:to-red-950/30"
        borderColor="border-red-400"
        glowClass="glow-red-100"
      />
      <MetricCard
        title="Atenção"
        value={atencaoCount}
        icon={TrendingUp}
        color="text-amber-400"
        bgGradient="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-[#3a2a00] dark:to-amber-950/30"
        borderColor="border-amber-400"
        glowClass="glow-amber-100"
      />
      <MetricCard
        title="Operacional"
        value={operacionalCount}
        icon={CheckCircle}
        color="text-emerald-400"
        bgGradient="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-[#092a1f] dark:to-emerald-950/30"
        borderColor="border-emerald-400"
        glowClass="glow-emerald-100"
      />

      {/* Novo diálogo de alerta de inspeção */}
      <InspectionAlertDialog 
        open={isAlertDialogOpen} 
        setOpen={setIsAlertDialogOpen} 
        tanks={tanquesComAgua} 
      />
    </div>
  );
};

export default MetricsCards;
