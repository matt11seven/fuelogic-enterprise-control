
import { useState, useMemo } from "react";
import { getFuelColor } from "../utils/fuelColors";
import { getProductCode } from "../utils/fuelCodes";
import { MapPin, ArrowUpDown, Droplets } from "lucide-react";
import FuelTank from "./FuelTank";
import TankDetails from "./TankDetails";
import { useConfig } from "@/context/ConfigContext";
import StatusIndicators from "./StatusIndicators";
import { TankData } from "@/types/api";

interface Tank {
  id: string;
  code: string;
  type: string;
  current: number;
  capacity: number;
  apiData?: TankData; // Referência para dados completos da API
}

interface StationCardProps {
  id: string;
  name: string;
  address: string;
  tanks: Tank[];
  onTankSelect: (stationId: string, tankId: string, selected: boolean) => void;
  onQuantityChange: (stationId: string, tankId: string, quantity: number) => void;
  selectedTanks: Record<string, { selected: boolean; quantity: number }>;
}

type SortType = 'number' | 'fuel';

const StationCard = ({
  id, 
  name, 
  address, 
  tanks, 
  onTankSelect, 
  onQuantityChange, 
  selectedTanks 
}: StationCardProps) => {
  // Obter os thresholds configurados do contexto global
  const { thresholds } = useConfig();
  const [expandedTankId, setExpandedTankId] = useState<string | null>(null);
  const [stationExpanded, setStationExpanded] = useState<boolean>(false);
  const [sortType, setSortType] = useState<SortType>('number');
  
  const expandTankDetails = (tankId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setExpandedTankId(expandedTankId === tankId ? null : tankId);
    // Quando expandir um tanque específico, feche a expansão da estação
    if (stationExpanded) {
      setStationExpanded(false);
    }
  };
  
  const toggleStationExpansion = () => {
    // Alternar entre expandido e colapsado
    setStationExpanded(!stationExpanded);
    // Se estava expandido um tanque específico, feche-o
    if (expandedTankId) {
      setExpandedTankId(null);
    }
  };
  
  const toggleSortType = (event: React.MouseEvent) => {
    event.stopPropagation();
    setSortType(sortType === 'number' ? 'fuel' : 'number');
  };
  
  const getSortedTanks = () => {
    const tanksToSort = [...tanks];
    
    if (sortType === 'number') {
      // Ordenar por número do tanque (campo Tanque da API)
      return tanksToSort.sort((a, b) => {
        const tankNumberA = a.apiData?.Tanque || 0;
        const tankNumberB = b.apiData?.Tanque || 0;
        return tankNumberA - tankNumberB;
      });
    } else {
      // Ordenar por quantidade de combustível (maior para menor)
      return tanksToSort.sort((a, b) => b.current - a.current);
    }
  };

  const sortedTanks = getSortedTanks();
  
  const getStationStatus = () => {
    const criticalTanks = tanks.filter(tank => (tank.current / tank.capacity) < 0.2).length;
    const warningTanks = tanks.filter(tank => {
      const percentage = tank.current / tank.capacity;
      return percentage >= 0.2 && percentage < 0.5;
    }).length;

    if (criticalTanks > 0) return { color: 'red', label: 'Crítico', count: criticalTanks };
    if (warningTanks > 0) return { color: 'amber', label: 'Atenção', count: warningTanks };
    return { color: 'emerald', label: 'Operacional', count: tanks.length };
  };

  const status = getStationStatus();

  const renderMiniTank = (tank: Tank) => {
    const percentage = (tank.current / tank.capacity) * 100;
    // Verificar se tem água no tanque
    const hasWater = tank.apiData && tank.apiData.QuantidadeDeAgua > 0;
    
    const getColor = () => {
      // Priorizar alerta de água sobre outros status
      if (hasWater) return 'bg-blue-500';
      
      // Status baseados no nível de combustível - usando thresholds configurados
      if (percentage < thresholds.threshold_critico) return 'bg-red-500';
      if (percentage < thresholds.threshold_atencao) return 'bg-amber-500';
      return 'bg-emerald-500';
    };

    const getCodeColor = getFuelColor(getProductCode(tank.code));

    const isExpanded = expandedTankId === tank.id;
    const tankNumber = tank.apiData?.Tanque || 0;

    return (
      <div 
        key={tank.id} 
        className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-90 transition-opacity min-w-[48px] flex-shrink-0 relative group"
        onClick={(e) => expandTankDetails(tank.id, e)}
        aria-expanded={isExpanded}
        title={`Tanque ${tankNumber} - ${tank.type} - Clique para ${isExpanded ? 'fechar' : 'ver'} detalhes`}
      >
        {/* Indicador de água moderno e elegante */}
        {hasWater && (
          <div className="absolute -top-1 -right-1 z-10">
            <div className="relative">
              {/* Glow effect sutil */}
              <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-sm animate-pulse"></div>
              
              {/* Indicador principal */}
              <div className="relative bg-gradient-to-br from-blue-400 to-blue-600 rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-blue-300/40">
                <Droplets className="w-2.5 h-2.5 text-white" />
              </div>
              
              {/* Tooltip elegante */}
              <div className="absolute -bottom-6 -left-8 bg-blue-900/95 backdrop-blur-sm text-blue-100 text-xs px-2 py-1 rounded shadow-lg border border-blue-400/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                {tank.apiData?.QuantidadeDeAgua.toLocaleString()}L água
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-0 h-0 border-l-1 border-r-1 border-b-1 border-transparent border-b-blue-900/95"></div>
              </div>
            </div>
          </div>
        )}

        <div className={`hex-badge ${getCodeColor} text-white text-xs ${isExpanded ? 'ring-2 ring-white/50' : ''} relative w-7 h-7 sm:w-8 sm:h-8`}>
          <span className="text-xs sm:text-sm">{tank.code}</span>
        </div>
        
        <div className="w-3 h-6 sm:w-4 sm:h-8 bg-slate-700 rounded-sm overflow-hidden relative">
          {/* Espaço vazio na parte superior */}
          <div 
            className="w-full bg-slate-700 absolute bottom-0 left-0 right-0 transition-all duration-500"
            style={{ height: `${100 - percentage}%` }}
          />
          {/* Combustível na parte inferior */}
          <div 
            className={`w-full ${getColor()} absolute bottom-0 left-0 right-0 transition-all duration-500`}
            style={{ height: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-slate-400">{percentage.toFixed(0)}%</span>
        <span className="text-xs text-slate-500">T{tankNumber}</span>
      </div>
    );
  };

  const hasSelectedTanks = tanks.some(tank => selectedTanks[`${id}-${tank.id}`]?.selected);
  const expandedTank = sortedTanks.find(tank => tank.id === expandedTankId);

  return (
    <div className="glass-card-hover">
      <div 
        className="p-4 sm:p-6 cursor-pointer" 
        onClick={toggleStationExpansion}
      >
        {/* Mobile-first layout - stack vertically on small screens */}
        <div className="space-y-4">
          {/* Station info section */}
          <div className="flex items-start space-x-3 sm:space-x-4">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-emerald-400 break-words">{name}</h3>
              <p className="text-slate-400 text-sm break-words">{address}</p>
            </div>
            {/* Status indicators - positioned for mobile */}
            <div className="flex-shrink-0">
              <StatusIndicators tanks={tanks} compact={true} />
            </div>
          </div>
          
          {/* Sort button and tanks section */}
          <div className="w-full overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">
                Tanques ({sortedTanks.length})
              </span>
              <button
                onClick={toggleSortType}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-600/50 rounded-md transition-colors text-slate-300"
                title={`Ordenar por ${sortType === 'number' ? 'quantidade de combustível' : 'número do tanque'}`}
              >
                <ArrowUpDown className="w-3 h-3" />
                {sortType === 'number' ? 'Nº' : 'Qtd'}
              </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:flex xl:space-x-4 gap-2 sm:gap-3 xl:gap-0 justify-items-center xl:justify-start">
              {sortedTanks.map(renderMiniTank)}
            </div>
          </div>
        </div>

        {/* Seção expandida de detalhes do tanque individual */}
        {expandedTank?.apiData && !stationExpanded && (
          <TankDetails 
            tank={expandedTank.apiData} 
            onClose={() => setExpandedTankId(null)} 
          />
        )}
        
        {/* Seção expandida para todos os tanques da estação */}
        {stationExpanded && sortedTanks.length > 0 && (
          <div className="station-details-expansion is-visible mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-emerald-400">Detalhes dos Tanques</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSortType}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-600/50 rounded-md transition-colors text-slate-300"
                  title={`Ordenar por ${sortType === 'number' ? 'quantidade de combustível' : 'número do tanque'}`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  {sortType === 'number' ? 'Por Número' : 'Por Quantidade'}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setStationExpanded(false);
                  }}
                  className="p-1 hover:bg-slate-700/50 rounded-full transition-colors"
                  aria-label="Fechar detalhes"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedTanks.map(tank => (
                tank.apiData && (
                  <TankDetails 
                    key={tank.id}
                    tank={tank.apiData} 
                    onClose={(e) => {
                      if (e) e.stopPropagation();
                      setStationExpanded(false);
                    }} 
                    compact={true}
                  />
                )
              ))}
            </div>
          </div>
        )}

        {hasSelectedTanks && (
          <div className="animate-fade-in border-t border-white/10 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedTanks
                .filter(tank => selectedTanks[`${id}-${tank.id}`]?.selected)
                .map(tank => (
                  <FuelTank
                    key={tank.id}
                    code={tank.code}
                    type={tank.type}
                    current={tank.current}
                    capacity={tank.capacity}
                    isSelected={selectedTanks[`${id}-${tank.id}`]?.selected || false}
                    onSelect={(selected) => onTankSelect(id, tank.id, selected)}
                    quantity={selectedTanks[`${id}-${tank.id}`]?.quantity || 0}
                    onQuantityChange={(quantity) => onQuantityChange(id, tank.id, quantity)}
                    waterAmount={tank.apiData?.QuantidadeDeAgua}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StationCard;
