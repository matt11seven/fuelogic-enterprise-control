import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X } from "lucide-react";
import { TankData } from "@/types/api";

interface TankDetailsProps {
  tank: TankData;
  onClose: (e?: React.MouseEvent) => void;
  compact?: boolean; // Modo compacto para exibição em grid
}

const TankDetails = ({ tank, onClose, compact = false }: TankDetailsProps) => {
  const [mounted, setMounted] = useState(false);
  
  // Animar entrada do componente
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Função para parsear a data da API (formato "\/Date(timestamp)\/" para Date)
  const parseApiDate = (dateString: string): Date => {
    const timestamp = parseInt(dateString.replace(/\/Date\((\d+)\)\//, "$1"));
    return new Date(timestamp);
  };

  // Formatar data de medição em forma relativa (há X tempo)
  const formatMeasurementDate = (dateString: string): string => {
    try {
      const date = parseApiDate(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (error) {
      return "Data desconhecida";
    }
  };

  // Obter código do produto para o badge
  const getProductCode = (): string => {
    const productMap: Record<string, string> = {
      'GASOLINA COMUM': 'GC',
      'GASOLINA GRID': 'GA',
      'GASOLINA ADITIVADA': 'GA',
      'GASOLINA PODIUM': 'GP',
      'DIESEL S10': 'S10',
      'DIESEL S10 GRID': 'S10A',
      'DIESEL COMUM': 'DS',
      'ETANOL': 'ET',
      ' GASOLINA PODIUM': 'GP', // Note o espaço extra antes de GASOLINA PODIUM no payload
    };
    
    return productMap[tank.Produto.trim()] || 'XX';
  };

  // Obter cor para o badge baseado no código do produto
  const getCodeColor = () => {
    switch (getProductCode()) {
      case 'GC': return 'bg-red-500';        // Gasolina Comum - Vermelho
      case 'GA': return 'bg-blue-500';       // Gasolina Aditivada - Azul  
      case 'GP': return 'bg-purple-500';     // Gasolina Podium - Roxo
      case 'S10': return 'bg-yellow-500';    // Diesel S10 - Amarelo
      case 'S10A': return 'bg-orange-500';   // Diesel S10 Aditivado - Laranja
      case 'DS': return 'bg-amber-600';      // Diesel Comum - Âmbar
      case 'ET': return 'bg-green-500';      // Etanol - Verde
      default: return 'bg-slate-500';
    }
  };

  // Obter classe para card de status baseado no nível
  const getStatusClass = () => {
    const percentual = tank.NivelEmPercentual;
    if (percentual < 20) return "border-red-500/30 from-red-950/30 to-transparent";
    if (percentual < 50) return "border-amber-500/30 from-amber-950/30 to-transparent";
    return "border-emerald-500/30 from-emerald-950/30 to-transparent";
  };

  return (
    <div 
      className={`tank-details-expansion ${mounted ? 'is-visible' : ''} ${compact ? 'compact p-4' : ''}`}
      aria-expanded={mounted}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="expansion-header flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className={`hex-badge ${getCodeColor()} text-white font-bold`}>
            {getProductCode()}
          </span>
          <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-white'}`}>
            {tank.Produto} - Tanque #{tank.NumeroDoTanque}
          </h3>
        </div>
        {!compact && (
          <button 
            onClick={(e) => onClose(e)}
            className="p-1 hover:bg-slate-700/50 rounded-full transition-colors"
            aria-label="Fechar detalhes"
          >
            <X size={18} className="text-slate-400" />
          </button>
        )}
      </div>

      <div className={`details-grid grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-4`}>
        <div className={`detail-card border bg-gradient-to-b ${getStatusClass()} rounded-lg p-4`}>
          <h4 className="text-slate-400 text-sm font-medium mb-1">Volume Atual</h4>
          <div className="value text-white font-bold text-xl">
            {tank.QuantidadeAtual.toLocaleString(undefined, {maximumFractionDigits: 0})}L
            <span className="text-sm font-normal text-slate-400 ml-2">
              ({tank.NivelEmPercentual.toFixed(1)}%)
            </span>
          </div>
        </div>
        
        <div className="detail-card border border-slate-700/50 bg-gradient-to-b from-slate-900/50 to-transparent rounded-lg p-4">
          <h4 className="text-slate-400 text-sm font-medium mb-1">Temperatura</h4>
          <div className="value text-white font-bold text-xl">
            {tank.Temperatura.toFixed(1)}°C
          </div>
        </div>
        
        <div className="detail-card border border-slate-700/50 bg-gradient-to-b from-slate-900/50 to-transparent rounded-lg p-4">
          <h4 className="text-slate-400 text-sm font-medium mb-1">Capacidade Total</h4>
          <div className="value text-white font-bold text-xl">
            {tank.CapacidadeDoTanque.toLocaleString(undefined, {maximumFractionDigits: 0})}L
          </div>
        </div>
        
        <div className="detail-card border border-slate-700/50 bg-gradient-to-b from-slate-900/50 to-transparent rounded-lg p-4">
          <h4 className="text-slate-400 text-sm font-medium mb-1">Volume Vazio</h4>
          <div className="value text-white font-bold text-xl">
            {tank.QuantidadeVazia.toLocaleString(undefined, {maximumFractionDigits: 0})}L
          </div>
        </div>

        {tank.QuantidadeDeAgua > 0 && (
          <div className="detail-card border border-red-700/50 bg-gradient-to-b from-red-950/30 to-transparent rounded-lg p-4">
            <h4 className="text-red-400 text-sm font-medium mb-1">Água Detectada</h4>
            <div className="value text-white font-bold text-xl">
              {tank.QuantidadeDeAgua.toLocaleString(undefined, {maximumFractionDigits: 1})}L
            </div>
          </div>
        )}
        
        <div className="detail-card border border-slate-700/50 bg-gradient-to-b from-slate-900/50 to-transparent rounded-lg p-4">
          <h4 className="text-slate-400 text-sm font-medium mb-1">Última Medição</h4>
          <div className="value text-white font-medium">
            {formatMeasurementDate(tank.DataMedicao)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TankDetails;
