
import { useState } from "react";
import { MapPin } from "lucide-react";
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
    const getColor = () => {
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

    return (
      <div 
        key={tank.id} 
        className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={(e) => expandTankDetails(tank.id, e)}
        aria-expanded={isExpanded}
        title={`Clique para ${isExpanded ? 'fechar' : 'ver'} detalhes do tanque de ${tank.type}`}
      >
        <div className={`hex-badge ${getCodeColor()} text-white text-xs ${isExpanded ? 'ring-2 ring-white/50' : ''}`}>
          {tank.code}
        </div>
        <div className="w-4 h-8 bg-slate-700 rounded-sm overflow-hidden relative">
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
      </div>
    );
  };

  const hasSelectedTanks = tanks.some(tank => selectedTanks[`${id}-${tank.id}`]?.selected);
  const expandedTank = tanks.find(tank => tank.id === expandedTankId);

  return (
    <div className="glass-card-hover">
      <div 
        className="p-6 cursor-pointer" 
        onClick={toggleStationExpansion}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-emerald-400">{name}</h3>
              <p className="text-slate-400 text-sm">{address}</p>
            </div>
            
            <div className="flex items-center space-x-4 ml-8">
              {tanks.map(renderMiniTank)}
            </div>
          </div>
          
          <div className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${
            status.color === 'red' ? 'bg-red-900/30 text-red-400 border border-red-500/30' :
            status.color === 'amber' ? 'bg-amber-900/30 text-amber-400 border border-amber-500/30' :
            'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
          }`}>
            {status.label} ({status.count})
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
        {stationExpanded && tanks.length > 0 && (
          <div className="station-details-expansion is-visible mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-emerald-400">Detalhes dos Tanques</h3>
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {tanks.map(tank => (
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
              {tanks
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
