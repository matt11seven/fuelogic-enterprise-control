import { useState, useRef, useEffect } from "react";
import { ChevronDown, Filter, MapPin, Search, X, ChevronsDown, ChevronsUp } from "lucide-react";
import { Droplet, Truck, AlertTriangle } from 'lucide-react';
import { getFuelColor } from '../utils/fuelColors';
import { getProductCode } from '../utils/fuelCodes';
import { useConfig } from "@/context/ConfigContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import QuickActions from "./QuickActions";
import StatusIndicators from "./StatusIndicators";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import OccupancyBar from "./OccupancyBar";
import { useMockData } from '@/context/MockDataContext';
import { TankData, StationData } from '@/types/api';

// Definir interfaces adaptadas para o componente
interface Tank {
  id: string;
  code: string;
  type: string;
  current: number;
  capacity: number;
  apiData?: TankData;
  expectedSales?: number; // Venda prevista (mock)
  expectedDelivery?: number; // Recebimento previsto (mock)
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

  // Usar o utilitário centralizado para cores de combustível

  const formatWaterAmount = (waterAmount: number) => {
    return waterAmount.toLocaleString(undefined, {maximumFractionDigits: 1});
  };

  // Usar o utilitário centralizado para cores de combustível importado de '../utils/fuelColors'

  // Usar o contexto para obter dados mock estáveis
  const { getMockDataForTank, generateMockDataForStations } = useMockData();
  
  // Gerar dados mock para todas as estações ao montar o componente
  useEffect(() => {
    generateMockDataForStations(stations);
  }, [stations, generateMockDataForStations]);
  
  // Aplicar dados mock às estações
  const stationsWithMockData = stations.map(station => ({
    ...station,
    tanks: station.tanks.map(tank => {
      const mockData = getMockDataForTank(station.id, tank.id);
      return {
        ...tank,
        expectedSales: mockData.expectedSales,
        expectedDelivery: mockData.expectedDelivery
      };
    })
  }));
  
  // Filtrar estações com base nos filtros
  const filteredStations = stationsWithMockData.filter(station => {
    // Filtro por nome da estação
    if (searchTerm && !station.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !station.address?.toLowerCase().includes(searchTerm.toLowerCase())) {
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

  // Calcular totais apenas para os postos filtrados
  const calculateTotals = () => {
    let totalOrderQuantity = 0;
    let totalFillCapacity = 0;
    let totalCapacity = 0;
    let totalCurrent = 0;
    let totalExpectedSales = 0;
    let totalExpectedDelivery = 0;

    filteredStations.forEach(station => {
      station.tanks.forEach(tank => {
        const tankId = `${station.id}-${tank.id}`;
        const selectedTank = selectedTanks[tankId];
        
        if (selectedTank?.selected && selectedTank?.quantity > 0) {
          totalOrderQuantity += selectedTank.quantity;
        }
        
        totalFillCapacity += (tank.capacity - tank.current);
        totalCapacity += tank.capacity;
        totalCurrent += tank.current;
        totalExpectedSales += tank.expectedSales || 0;
        totalExpectedDelivery += tank.expectedDelivery || 0;
      });
    });
    
    // Ocupação atual (Volume atual / Capacidade total)
    const occupancyPercentage = totalCapacity > 0 ? (totalCurrent / totalCapacity) * 100 : 0;
    
    // Após recebimento (Volume atual + Recebimento previsto / Capacidade total)
    const volumeAfterDelivery = totalCurrent + totalExpectedDelivery;
    const occupancyAfterDeliveryPercentage = totalCapacity > 0 ? (volumeAfterDelivery / totalCapacity) * 100 : 0;
    
    // Projeção final (Volume após recebimento + Pedido / Capacidade total)
    const projectedWithSalesAndDelivery = volumeAfterDelivery + totalOrderQuantity;
    const finalOccupancyPercentage = totalCapacity > 0 ? (projectedWithSalesAndDelivery / totalCapacity) * 100 : 0;

    return { 
      totalOrderQuantity, 
      totalFillCapacity, 
      totalCapacity,
      totalCurrent,
      occupancyPercentage,
      volumeAfterDelivery,
      occupancyAfterDeliveryPercentage,
      totalExpectedSales,
      totalExpectedDelivery,
      projectedWithSalesAndDelivery,
      finalOccupancyPercentage
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-4">
      {/* Totalizadores */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div className="bg-blue-100/80 dark:bg-blue-900/20 p-3 rounded-lg shadow-sm">
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Pedido Total</div>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {Math.floor(totals.totalOrderQuantity).toLocaleString()} L
          </div>
        </div>
        <div className="bg-emerald-100/80 dark:bg-emerald-900/20 p-3 rounded-lg shadow-sm">
          <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Capacidade Livre</div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {Math.floor(totals.totalFillCapacity).toLocaleString()} L
          </div>
        </div>
        
        <div className="bg-purple-100/80 dark:bg-purple-900/20 p-3 rounded-lg shadow-sm">
          <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Venda Prevista</div>
          <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
            {Math.floor(totals.totalExpectedSales).toLocaleString()} L
          </div>
        </div>
        
        <div className="bg-indigo-100/80 dark:bg-indigo-900/20 p-3 rounded-lg shadow-sm">
          <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">Recebimento Previsto</div>
          <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
            {Math.floor(totals.totalExpectedDelivery).toLocaleString()} L
          </div>
        </div>
        <div className="bg-amber-100/80 dark:bg-amber-900/20 p-3 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm text-amber-600 dark:text-amber-400">Ocupação</div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {Math.round(totals.occupancyPercentage)}%
            </div>
          </div>
          
          {/* Componente de barra de ocupação */}
          <OccupancyBar
            currentOccupancy={totals.occupancyPercentage}
            afterDeliveryOccupancy={totals.occupancyAfterDeliveryPercentage}
            finalProjectionOccupancy={totals.finalOccupancyPercentage}
            height="h-3"
            legendClassName="text-xs"
          />
        </div>
      </div>

      {/* Filtros */}
      {/* Legenda de tipos de combustível */}
      <div className="flex flex-wrap gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2 bg-slate-50/80 dark:bg-slate-800/30 p-2 rounded-lg shadow-sm">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Tipos de combustível:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-slate-600 dark:text-slate-400">GC - Gasolina Comum</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-slate-600 dark:text-slate-400">GA - Gasolina Aditivada</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-xs text-slate-600 dark:text-slate-400">GP - Gasolina Podium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-slate-600 dark:text-slate-400">S10 - Diesel S10</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-xs text-slate-600 dark:text-slate-400">S10A - Diesel S10 Aditivado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-600"></div>
            <span className="text-xs text-slate-600 dark:text-slate-400">DS - Diesel Comum</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-slate-600 dark:text-slate-400">ET - Etanol</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span className="text-xs text-slate-600 dark:text-slate-400">AR - Arla</span>
          </div>
        </div>
      </div>
      
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
                  
                  <div className="flex items-center justify-center space-x-3 flex-grow">
                    <div className="flex flex-wrap items-center justify-center gap-2 py-1 w-full">
                      {/* Mini indicadores visuais dos tanques */}
                      {station.tanks.map(tank => {
                        const tankStatus = getTankStatus(tank);
                        const hasWater = tank.apiData && tank.apiData.QuantidadeDeAgua > 0;
                        return (
                          <div 
                            key={tank.id} 
                            className="relative group flex-shrink-0"
                            title={`${tank.code} - ${tankStatus.label} - ${Math.round(tankStatus.percentage)}%${hasWater ? ` - ${formatWaterAmount(tank.apiData?.QuantidadeDeAgua || 0)}L de água` : ''}`}
                          >
                            <div className="flex flex-col items-center">
                              <div className="relative flex items-center justify-center">
                                <div 
                                  className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white ${getFuelColor(getProductCode(tank.code))}`}
                                >
                                  {tank.code}
                                </div>
                                <div 
                                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${hasWater ? 'bg-blue-500' : 
                                    tankStatus.percentage < thresholds.threshold_critico ? 'bg-red-500' : 
                                    tankStatus.percentage < thresholds.threshold_atencao ? 'bg-amber-500' : 
                                    'bg-emerald-500'} text-white text-[10px] rounded-md px-1.5 py-0.5 flex items-center justify-center font-bold border-2 border-white dark:border-white shadow-sm`}
                                >
                                  {Math.round(tankStatus.percentage)}%
                                </div>
                              </div>
                            </div>
                            <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity duration-200 z-10">
                              {tank.code} - {Math.round(tankStatus.percentage)}%
                              {hasWater && <div className="text-blue-300">{formatWaterAmount(tank.apiData?.QuantidadeDeAgua || 0)}L água</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                                  <Badge className={`${getFuelColor(getProductCode(tank.code))} text-white shadow-sm`}>{tank.code}</Badge>
                                  <span className="text-slate-800 dark:text-white font-medium">Tanque {tankNumber}</span>
                                  <span className="text-sm text-slate-600 dark:text-slate-400">{tank.type}</span>
                                </div>
                                
                                <div className="flex items-center">
                                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                    {Math.floor(tank.current).toLocaleString()} / {Math.floor(tank.capacity).toLocaleString()} L
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
                              <div className="grid grid-cols-4 gap-2 mt-2">
                                <div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">Atual/Capacidade</div>
                                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                                    {tank.current.toLocaleString()}/{tank.capacity.toLocaleString()} L
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">Quantidade</div>
                                  <div className="flex items-center">
                                    <input
                                      type="number"
                                      value={quantity}
                                      onChange={(e) => onQuantityChange(station.id, tank.id, Number(e.target.value))}
                                      max={tank.capacity - tank.current}
                                      min={0}
                                      step="1000"
                                      className="w-24 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                      placeholder="0"
                                    />
                                    <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">L</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-purple-500 dark:text-purple-400">Venda Prevista</div>
                                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                                    {(tank.expectedSales || 0).toLocaleString()} L
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-indigo-500 dark:text-indigo-400">Recebimento</div>
                                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                                    {(tank.expectedDelivery || 0).toLocaleString()} L
                                  </div>
                                </div>
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
