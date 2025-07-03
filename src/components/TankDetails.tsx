import { useEffect, useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Droplets, Thermometer, AlertTriangle, CheckCircle } from "lucide-react";
import { getFuelColor } from "../utils/fuelColors";
import { getProductCode, getProductInfo } from "../utils/fuelCodes";
import { TankData } from "@/types/api";

interface TankDetailsProps {
  tank: TankData;
  onClose: (e?: React.MouseEvent) => void;
  compact?: boolean;
}

const TankDetails = ({ tank, onClose, compact = false }: TankDetailsProps) => {
  const [mounted, setMounted] = useState(false);
  
  // Animar entrada do componente
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Memoizar cálculos pesados
  const tankAnalysis = useMemo(() => {
    const percentual = tank.NivelEmPercentual;
    const hasWater = tank.QuantidadeDeAgua > 0;
    const isLowLevel = percentual < 25;
    const isCritical = percentual < 10;
    const isHigh = percentual > 90;
    
    return {
      percentual,
      hasWater,
      isLowLevel,
      isCritical,
      isHigh,
      status: isCritical ? 'critical' : isLowLevel ? 'warning' : isHigh ? 'high' : 'normal'
    };
  }, [tank.NivelEmPercentual, tank.QuantidadeDeAgua]);

  // Função para parsear a data da API (otimizada)
  const parseApiDate = (dateString: string): Date => {
    const timestamp = parseInt(dateString.replace(/\/Date\((\d+)\)\//, "$1"));
    return new Date(timestamp);
  };

  // Formatar data de medição em forma relativa (memoizada)
  const measurementTime = useMemo(() => {
    try {
      const date = parseApiDate(tank.DataMedicao);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (error) {
      return "Data desconhecida";
    }
  }, [tank.DataMedicao]);

  // Obter código do produto para o badge (usando o utilitário centralizado)
  const productInfo = useMemo(() => {
    return getProductInfo(tank.Produto.trim());
  }, [tank.Produto]);

  // Sistema de cores inteligente baseado no status
  const getStatusStyling = () => {
    const baseClasses = "border rounded-lg p-4 transition-all duration-300";
    
    switch (tankAnalysis.status) {
      case 'critical':
        return {
          card: `${baseClasses} border-red-500/40 bg-gradient-to-br from-red-950/40 via-red-900/20 to-transparent shadow-red-500/10`,
          icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
          badge: "bg-red-500/20 text-red-400 border-red-500/30"
        };
      case 'warning':
        return {
          card: `${baseClasses} border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-transparent shadow-amber-500/10`,
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          badge: "bg-amber-500/20 text-amber-400 border-amber-500/30"
        };
      case 'high':
        return {
          card: `${baseClasses} border-blue-500/40 bg-gradient-to-br from-blue-950/40 via-blue-900/20 to-transparent shadow-blue-500/10`,
          icon: <CheckCircle className="w-5 h-5 text-blue-400" />,
          badge: "bg-blue-500/20 text-blue-400 border-blue-500/30"
        };
      default:
        return {
          card: `${baseClasses} border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-transparent shadow-emerald-500/10`,
          icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
          badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
        };
    }
  };

  const statusStyling = getStatusStyling();
  const standardCardClass = "border border-slate-700/30 bg-gradient-to-br from-slate-900/40 via-slate-800/20 to-transparent rounded-lg p-4 hover:border-slate-600/50 transition-all duration-200";

  // Formatação de números otimizada
  const formatVolume = (volume: number) => volume.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  const formatTemperature = (temp: number) => temp.toFixed(1);
  const formatPercentage = (percent: number) => percent.toFixed(1);

  return (
    <div 
      className={`tank-details-expansion ${mounted ? 'is-visible' : ''} ${compact ? 'compact p-4' : ''}`}
      aria-expanded={mounted}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header melhorado com status visual */}
      <div className="expansion-header flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <span className={`hex-badge ${getFuelColor(productInfo.code)} text-white font-bold text-sm px-3 py-1 rounded-md shadow-lg`}>
            {productInfo.code}
          </span>
          <div>
            <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-white text-lg'}`}>
              {productInfo.name}
            </h3>
            <p className="text-slate-400 text-sm">
              Tanque #{tank.NumeroDoTanque} • {tank.Cliente}
            </p>
          </div>
          
          {/* Status badge */}
          <div className={`px-3 py-1 rounded-full border text-xs font-medium ${statusStyling.badge} flex items-center gap-1`}>
            {statusStyling.icon}
            <span>
              {tankAnalysis.status === 'critical' ? 'CRÍTICO' :
               tankAnalysis.status === 'warning' ? 'BAIXO' :
               tankAnalysis.status === 'high' ? 'CHEIO' : 'NORMAL'}
            </span>
          </div>
        </div>
        
        {!compact && (
          <button 
            onClick={(e) => onClose(e)}
            className="p-2 hover:bg-slate-700/50 rounded-full transition-colors group"
            aria-label="Fechar detalhes"
          >
            <X size={18} className="text-slate-400 group-hover:text-white transition-colors" />
          </button>
        )}
      </div>

      {/* Grid de métricas melhorado */}
      <div className={`details-grid grid grid-cols-1 ${compact ? 'sm:grid-cols-2 gap-3' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
        
        {/* Volume Atual - Card principal com status */}
        <div className={statusStyling.card}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-slate-300 text-sm font-medium">Volume Atual</h4>
            {statusStyling.icon}
          </div>
          <div className="space-y-1">
            <div className="text-white font-bold text-2xl">
              {formatVolume(tank.QuantidadeAtual)}L
            </div>
            <div className="text-slate-400 text-sm">
              {formatPercentage(tank.NivelEmPercentual)}% da capacidade
            </div>
            {tankAnalysis.isCritical && (
              <div className="text-red-400 text-xs font-medium mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Reabastecer urgente
              </div>
            )}
          </div>
        </div>
        
        {/* Temperatura com ícone */}
        <div className={standardCardClass}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-slate-400 text-sm font-medium">Temperatura</h4>
            <Thermometer className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-white font-bold text-xl">
            {formatTemperature(tank.Temperatura)}°C
          </div>
          <div className="text-slate-500 text-xs mt-1">
            {tank.Temperatura > 30 ? 'Alta' : tank.Temperatura < 20 ? 'Baixa' : 'Normal'}
          </div>
        </div>
        
        {/* Capacidade Total */}
        <div className={standardCardClass}>
          <h4 className="text-slate-400 text-sm font-medium mb-2">Capacidade Total</h4>
          <div className="text-white font-bold text-xl">
            {formatVolume(tank.CapacidadeDoTanque)}L
          </div>
          <div className="text-slate-500 text-xs mt-1">
            {formatVolume(tank.QuantidadeVazia)}L disponível
          </div>
        </div>
        
        {/* Volume Vazio */}
        <div className={standardCardClass}>
          <h4 className="text-slate-400 text-sm font-medium mb-2">Espaço Livre</h4>
          <div className="text-white font-bold text-xl">
            {formatVolume(tank.QuantidadeVazia)}L
          </div>
          <div className="text-slate-500 text-xs mt-1">
            {formatPercentage(100 - tank.NivelEmPercentual)}% do tanque
          </div>
        </div>

        {/* Água Detectada - aparece apenas se houver */}
        {tankAnalysis.hasWater && (
          <div className="border border-blue-500/40 bg-gradient-to-br from-blue-950/40 via-blue-900/20 to-transparent rounded-lg p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-blue-400 text-sm font-medium flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Água Detectada
              </h4>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
            <div className="text-blue-300 font-bold text-xl">
              {tank.QuantidadeDeAgua.toLocaleString('pt-BR', {maximumFractionDigits: 1})}L
            </div>
            <div className="text-blue-400/80 text-xs mt-1 font-medium">
              ⚠️ Requer atenção
            </div>
          </div>
        )}
        
        {/* Última Medição */}
        <div className={standardCardClass}>
          <h4 className="text-slate-400 text-sm font-medium mb-2">Última Medição</h4>
          <div className="text-white font-medium text-lg">
            {measurementTime}
          </div>
          <div className="text-slate-500 text-xs mt-1">
            {parseApiDate(tank.DataMedicao).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Footer com informações adicionais */}
      {!compact && (
        <div className="mt-6 pt-4 border-t border-slate-700/30">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Unidade: {tank.Unidade}</span>
            <span>Equipamento: #{tank.IndiceDoEquipamento}</span>
            <span>ID: {tank.Id}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TankDetails;