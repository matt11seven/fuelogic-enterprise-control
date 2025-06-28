
import { useState } from "react";
import { ChevronDown, Filter, MapPin, Search, X, ChevronsDown, ChevronsUp } from "lucide-react";
import { TankData } from "@/types/api";
import { Badge } from "./ui/badge";
import { useConfig } from "@/context/ConfigContext";
import { Button } from "./ui/button";
import QuickActions from "./QuickActions";
import StatusIndicators from "./StatusIndicators";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface Tank {
  id: string;
  code: string;
  type: string;
  current: number;
  capacity: number;
  apiData?: TankData;
}

interface Station {
  id: string;
  name: string;
  address: string;
  tanks: Tank[];
}

interface StationListViewProps {
  stations: Station[];
  onTankSelect: (stationId: string, tankId: string, selected: boolean) => void;
  onQuantityChange: (stationId: string, tankId: string, quantity: number) => void;
  selectedTanks: Record<string, { selected: boolean; quantity: number }>;
  onRequestFill?: (stationId: string, tankId: string) => void;
  onMarkInspection?: (stationId: string, tankId: string) => void;
  onViewHistory?: (stationId: string, tankId: string) => void;
}

export function StationListView({ 
  stations, 
  onTankSelect, 
  onQuantityChange, 
  selectedTanks,
  onRequestFill = () => {},
  onMarkInspection = () => {},
  onViewHistory = () => {}
}: StationListViewProps) {
  // Obter os thresholds configurados do contexto global
  const { thresholds } = useConfig();
  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'critical', 'warning', 'normal'
    level: 'all',  // 'all', 'low', 'medium', 'high'
    station: '',   // ID da estação ou vazio para todas
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleStationExpansion = (stationId: string) => {
    // Adicionar uma pequena animação ao expandir/colapsar
    setExpandedStations(prev => {
      const newState = {
        ...prev,
        [stationId]: !prev[stationId]
      };
      
      // Se estiver expandindo, role suavemente para o elemento
      if (newState[stationId]) {
        setTimeout(() => {
          const element = document.getElementById(`station-${stationId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
      
      return newState;
    });
  };

  const toggleAllStations = () => {
    const newExpandedState = !allExpanded;
    setAllExpanded(newExpandedState);
    
    // Criar um novo objeto com todas as estações expandidas ou colapsadas
    const newExpandedStations: Record<string, boolean> = {};
    stations.forEach(station => {
      newExpandedStations[station.id] = newExpandedState;
    });
    
    setExpandedStations(newExpandedStations);
    
    // Se estiver expandindo todas, role para o topo
    if (newExpandedState) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStationStatus = (tanks: Tank[]) => {
    const criticalThreshold = thresholds.threshold_critico / 100;
    const warningThreshold = thresholds.threshold_atencao / 100;
    
    const criticalTanks = tanks.filter(tank => (tank.current / tank.capacity) < criticalThreshold).length;
    const warningTanks = tanks.filter(tank => {
      const percentage = tank.current / tank.capacity;
      return percentage >= criticalThreshold && percentage < warningThreshold;
    }).length;

    if (criticalTanks > 0) return { color: 'red', label: 'Crítico', count: criticalTanks };
    if (warningTanks > 0) return { color: 'amber', label: 'Atenção', count: warningTanks };
    return { color: 'emerald', label: 'Operacional', count: tanks.length };
  };

  const getTankStatus = (tank: Tank) => {
    const percentage = (tank.current / tank.capacity) * 100;
    const hasWater = tank.apiData && tank.apiData.QuantidadeDeAgua > 0;
    
    if (hasWater) return { color: 'blue', label: 'Água', percentage };
    if (percentage < thresholds.threshold_critico) return { color: 'red', label: 'Crítico', percentage };
    if (percentage < thresholds.threshold_atencao) return { color: 'amber', label: 'Atenção', percentage };
    return { color: 'emerald', label: 'Operacional', percentage };
  };
  
  // Função para formatar a quantidade de água em litros
  // Usa o valor direto do JSON, que já vem em litros
  const formatWaterAmount = (waterAmount: number) => {
    return waterAmount.toLocaleString(undefined, {maximumFractionDigits: 1});
  };

  const getCodeColor = (code: string) => {
    switch (code) {
      case 'GC': return 'bg-red-500';        // Gasolina Comum - Vermelho
      case 'GA': return 'bg-blue-500';       // Gasolina Aditivada - Azul  
      case 'ET': return 'bg-green-500';      // Etanol - Verde
      case 'DS': return 'bg-yellow-500';     // Diesel S10 - Amarelo
      case 'DP': return 'bg-orange-500';     // Diesel Premium - Laranja
      case 'AD': return 'bg-purple-500';     // Arla/AdBlue - Roxo
      default: return 'bg-gray-500';         // Outros - Cinza
    }
  };

  const filteredStations = stations.filter(station => {
    // Filtro por nome da estação
    if (searchTerm && !station.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !station.address.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Filtro por estação específica
    if (filters.station && filters.station !== station.id) {
      return false;
    }

    // Filtro por status dos tanques
    if (filters.status !== 'all') {
      const hasTanksWithStatus = station.tanks.some(tank => {
        const percentage = tank.current / tank.capacity;
        const hasWater = tank.apiData && tank.apiData.QuantidadeDeAgua > 0;
        const criticalThreshold = thresholds.threshold_critico / 100;
        const warningThreshold = thresholds.threshold_atencao / 100;
        
        switch (filters.status) {
          case 'critical': return percentage < criticalThreshold;
          case 'warning': return percentage >= criticalThreshold && percentage < warningThreshold;
          case 'normal': return percentage >= warningThreshold && !hasWater;
          case 'water': return hasWater;
          default: return true;
        }
      });
      if (!hasTanksWithStatus) return false;
    }

    // Filtro por nível dos tanques
    if (filters.level !== 'all') {
      const hasTanksWithLevel = station.tanks.some(tank => {
        const percentage = tank.current / tank.capacity;
        // Usar thresholds do contexto para definir os filtros
        const criticalThreshold = thresholds.threshold_critico / 100;
        const warningThreshold = thresholds.threshold_atencao / 100;
        
        switch (filters.level) {
          case 'low': return percentage < criticalThreshold;
          case 'medium': return percentage >= criticalThreshold && percentage < warningThreshold;
          case 'high': return percentage >= warningThreshold;
          default: return true;
        }
      });
      if (!hasTanksWithLevel) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-grow max-w-md">
          <input
            type="text"
            placeholder="Buscar posto ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-field w-full pl-10 pr-10 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 dark:text-slate-400" />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="select-enhanced pl-10 pr-3 py-2 rounded-lg appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                >
                  <option value="all">Todos os status</option>
                  <option value="critical">Crítico</option>
                  <option value="warning">Atenção</option>
                  <option value="normal">Normal</option>
                  <option value="water">Com água</option>
                </select>
                <Filter className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 dark:text-slate-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filtrar por status do tanque</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({...filters, level: e.target.value})}
                  className="select-enhanced pl-10 pr-3 py-2 rounded-lg appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                >
                  <option value="all">Todos os níveis</option>
                  <option value="low">Crítico (&lt;{thresholds.threshold_critico}%)</option>
                  <option value="medium">Atenção ({thresholds.threshold_critico}-{thresholds.threshold_atencao}%)</option>
                  <option value="high">Operacional (&gt;{thresholds.threshold_atencao}%)</option>
                </select>
                <Filter className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 dark:text-slate-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filtrar por nível do tanque</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleAllStations}
                className="h-[42px] w-[42px] transition-all duration-200"
              >
                {allExpanded ? 
                  <ChevronsUp className="h-5 w-5" /> : 
                  <ChevronsDown className="h-5 w-5" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{allExpanded ? 'Colapsar todas as unidades' : 'Expandir todas as unidades'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {filters.status !== 'all' || filters.level !== 'all' || searchTerm ? (
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              setFilters({status: 'all', level: 'all', station: ''});
              setSearchTerm('');
            }}
            className="transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      
      <div className="space-y-2">
        {filteredStations.length === 0 ? (
          <div className="glass-card-hover p-6 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Nenhum posto encontrado com os filtros selecionados.
            </p>
          </div>
        ) : (
          filteredStations.map(station => {
            const status = getStationStatus(station.tanks);
            const isExpanded = expandedStations[station.id] || false;
            
            return (
              <div 
                key={station.id} 
                id={`station-${station.id}`} 
                className="glass-card-hover overflow-hidden transition-all duration-300 ease-in-out"
              >
                {/* Cabeçalho da estação */}
                <div 
                  className={`flex items-center justify-between cursor-pointer p-4 transition-all rounded-t-lg ${
                    expandedStations[station.id] 
                      ? 'bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-200/50 dark:border-slate-700/50' 
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => toggleStationExpansion(station.id)}
                  aria-expanded={expandedStations[station.id]}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`transform transition-transform duration-200 ease-in-out ${expandedStations[station.id] ? 'rotate-0' : '-rotate-90'}`}>
                      <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>
                    <MapPin className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <div>
                      <h3 className="text-lg font-medium text-slate-800 dark:text-white">{station.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{station.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <StatusIndicators tanks={station.tanks} compact={true} />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{station.tanks.length} tanques</span>
                  </div>
                </div>
                
                {/* Conteúdo expandido com animação */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedStations[station.id] ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="p-4 space-y-2 bg-slate-25/40 dark:bg-slate-900/20">
                      {station.tanks.map(tank => {
                        const tankStatus = getTankStatus(tank);
                        const tankId = `${station.id}-${tank.id}`;
                        const isSelected = selectedTanks[tankId]?.selected || false;
                        const quantity = selectedTanks[tankId]?.quantity || 0;
                        const tankNumber = tank.apiData?.Tanque || 0;
                        const hasWater = tank.apiData && tank.apiData.QuantidadeDeAgua > 0;
                        
                        return (
                          <div 
                            key={tank.id} 
                            className={`p-3 rounded-lg transition-all duration-200 ${
                              isSelected 
                                ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-500/30 shadow-sm' 
                                : 'bg-white/60 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/30 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-2">
                                <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => onTankSelect(station.id, tank.id, e.target.checked)}
                                      className="w-5 h-5 rounded border-slate-400 dark:border-slate-500 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-white dark:focus:ring-offset-slate-800 transition-colors"
                                    />
                                  </div>
                                  <Badge className={`${getCodeColor(tank.code)} text-white shadow-sm`}>{tank.code}</Badge>
                                  <span className="text-slate-800 dark:text-white font-medium">Tanque {tankNumber}</span>
                                  <span className="text-sm text-slate-600 dark:text-slate-400">{tank.type}</span>
                                </div>
                                
                                <div className="flex items-center">
                                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                    {tank.current.toLocaleString()} / {tank.capacity.toLocaleString()} L
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-4">
                                <div className="hidden md:flex items-center space-x-4">
                                  {/* Indicador de água */}
                                  {hasWater && (
                                    <div 
                                      className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200/50 dark:border-blue-800/50"
                                      title={`${formatWaterAmount(tank.apiData?.QuantidadeDeAgua || 0)} L de água`}
                                    >
                                      <span className="text-xs font-medium">
                                        {formatWaterAmount(tank.apiData?.QuantidadeDeAgua || 0)} L
                                      </span>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Status indicators e ações rápidas */}
                                <div className="flex items-center space-x-2">
                                  <StatusIndicators 
                                    tanks={[tank]} 
                                    compact={true} 
                                  />
                                  
                                  <QuickActions 
                                    tankId={tank.id}
                                    stationId={station.id}
                                    tankCode={tank.code}
                                    tankType={tank.type}
                                    isLowLevel={(tank.current / tank.capacity) < 0.2}
                                    hasWater={!!(tank.apiData && tank.apiData.QuantidadeDeAgua > 0)}
                                    onRequestFill={onRequestFill}
                                    onMarkInspection={onMarkInspection}
                                    onViewHistory={onViewHistory}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Barra de progresso */}
                            <div className="mt-3 relative h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/50">
                              <div 
                                className={`absolute top-0 left-0 bottom-0 ${
                                  tankStatus.color === 'red' ? 
                                  'bg-gradient-to-r from-red-500 to-red-400' : 
                                  tankStatus.color === 'amber' ? 
                                  'bg-gradient-to-r from-amber-500 to-amber-400' : 
                                  tankStatus.color === 'blue' ? 
                                  'bg-gradient-to-r from-blue-500 to-blue-400' : 
                                  'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                } rounded-full transition-all duration-500 shadow-sm`}
                                style={{ width: `${tankStatus.percentage}%` }}
                              />
                            </div>
                            
                            {/* Campo de quantidade para pedido (quando selecionado) */}
                            {isSelected && (
                              <div className="mt-3 animate-fade-in">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                  Quantidade para Pedido (L)
                                </label>
                                <input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => onQuantityChange(station.id, tank.id, Number(e.target.value))}
                                  max={tank.capacity - tank.current}
                                  min={0}
                                  step="5000"
                                  className="form-input w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                  placeholder="Digite a quantidade"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default StationListView;
