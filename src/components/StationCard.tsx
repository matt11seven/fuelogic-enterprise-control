
import { useState } from "react";
import { MapPin, ArrowUpDown } from "lucide-react";
import FuelTank from "./FuelTank";
import TankDetails from "./TankDetails";
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
      
      // Status baseados no nível de combustível
      if (percentage < 20) return 'bg-red-500';
      if (percentage < 50) return 'bg-amber-500';
      return 'bg-emerald-500';
    };

    const getCodeColor = () => {
      switch (tank.code) {
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

    const isExpanded = expandedTankId === tank.id;
    const tankNumber = tank.apiData?.Tanque || 0;

    return (
      <div 
        key={tank.id} 
        className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-90 transition-opacity min-w-[48px] flex-shrink-0"
        onClick={(e) => expandTankDetails(tank.id, e)}
        aria-expanded={isExpanded}
        title={`Tanque ${tankNumber} - ${tank.type} - Clique para ${isExpanded ? 'fechar' : 'ver'} detalhes`}
      >
        <div className={`hex-badge ${getCodeColor()} text-white text-xs ${isExpanded ? 'ring-2 ring-white/50' : ''} relative w-7 h-7 sm:w-8 sm:h-8`}>
          <span className="text-xs sm:text-sm">{tank.code}</span>
          {hasWater && (
            <div 
              className="absolute -bottom-1 -right-1 bg-blue-400 rounded-full w-4 h-4 border-2 border-blue-900 flex items-center justify-center shadow-lg z-10"
              title={`Água detectada: ${tank.apiData?.QuantidadeDeAgua.toLocaleString()}L`}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="#1e40af" 
                stroke="none"
                className="w-2.5 h-2.5"
              >
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
              </svg>
            </div>
          )}
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
            {/* Status badge - positioned for mobile */}
            <div className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
              status.color === 'red' ? 'bg-red-900/30 text-red-400 border border-red-500/30' :
              status.color === 'amber' ? 'bg-amber-900/30 text-amber-400 border border-amber-500/30' :
              'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
            }`}>
              <span className="hidden sm:inline">{status.label} ({status.count})</span>
              <span className="sm:hidden">({status.count})</span>
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
