
import { useState } from "react";
import { TankData } from "@/types/api";
import { Badge } from "./ui/badge";
import { useConfig } from "@/context/ConfigContext";
import { Button } from "./ui/button";
import { CheckCircle, AlertTriangle, AlertCircle, Droplet, Truck, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
  const { thresholds } = useConfig();
  const [selectedStation, setSelectedStation] = useState<string>('all');

  const getCodeColor = (code: string) => {
    if (code === 'S10') return 'bg-yellow-500';
    if (code === 'S10A') return 'bg-orange-500';
    
    const prefix = code.substring(0, 2).toUpperCase();
    
    switch (prefix) {
      case 'GC': return 'bg-red-500';
      case 'GA': return 'bg-blue-500';
      case 'GP': return 'bg-purple-500';
      case 'DS': return 'bg-amber-600';
      case 'ET': return 'bg-green-500';
      case 'AR': return 'bg-cyan-500';
      default: return 'bg-slate-500';
    }
  };

  const getTankStatus = (tank: Tank) => {
    const percentage = (tank.current / tank.capacity) * 100;
    const hasWater = tank.apiData && tank.apiData.QuantidadeDeAgua > 0;
    
    if (hasWater) return { color: 'blue', label: 'Água', percentage, icon: Droplet };
    if (percentage < thresholds.threshold_critico) return { color: 'red', label: 'Crítico', percentage, icon: AlertCircle };
    if (percentage < thresholds.threshold_atencao) return { color: 'amber', label: 'Atenção', percentage, icon: AlertTriangle };
    return { color: 'emerald', label: 'Operacional', percentage, icon: CheckCircle };
  };

  const formatWaterAmount = (waterAmount: number) => {
    return waterAmount.toLocaleString(undefined, {maximumFractionDigits: 1});
  };

  // Função para lidar com mudanças na quantidade
  const handleQuantityChange = (stationId: string, tankId: string, quantity: number) => {
    // Automaticamente seleciona o tanque se a quantidade for maior que 0
    const shouldSelect = quantity > 0;
    onTankSelect(stationId, tankId, shouldSelect);
    onQuantityChange(stationId, tankId, quantity);
  };

  // Filtrar estações
  const filteredStations = selectedStation === 'all' 
    ? stations 
    : stations.filter(station => station.id === selectedStation);

  // Calcular totais gerais
  const calculateTotals = () => {
    let totalOrderQuantity = 0;
    let totalFillCapacity = 0;

    filteredStations.forEach(station => {
      station.tanks.forEach(tank => {
        const tankId = `${station.id}-${tank.id}`;
        const selectedTank = selectedTanks[tankId];
        
        if (selectedTank?.quantity > 0) {
          totalOrderQuantity += selectedTank.quantity;
        }
        
        totalFillCapacity += (tank.capacity - tank.current);
      });
    });

    return { totalOrderQuantity, totalFillCapacity };
  };

  // Calcular totais por estação
  const getStationTotals = (station: Station) => {
    let orderQuantity = 0;
    let fillCapacity = 0;

    station.tanks.forEach(tank => {
      const tankId = `${station.id}-${tank.id}`;
      const selectedTank = selectedTanks[tankId];
      
      if (selectedTank?.quantity > 0) {
        orderQuantity += selectedTank.quantity;
      }
      
      fillCapacity += (tank.capacity - tank.current);
    });

    return { orderQuantity, fillCapacity };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-4">
      {/* Seletor de estação e totais gerais */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Filtrar por posto:
          </label>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos os postos</option>
            {stations.map(station => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </div>

        {/* Resumo geral */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              Pedido Total: {totals.totalOrderQuantity.toLocaleString()}L
            </span>
          </div>
          <div className="bg-emerald-100 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
              Capacidade Livre: {totals.totalFillCapacity.toLocaleString()}L
            </span>
          </div>
        </div>
      </div>

      {/* Lista de estações */}
      <div className="space-y-4">
        {filteredStations.map(station => {
          const stationTotals = getStationTotals(station);
          
          return (
            <Card key={station.id} className="glass-card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      {station.name}
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {station.address}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        Pedido: {stationTotals.orderQuantity.toLocaleString()}L
                      </span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                        Livre: {stationTotals.fillCapacity.toLocaleString()}L
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {station.tanks.map(tank => {
                  const tankId = `${station.id}-${tank.id}`;
                  const status = getTankStatus(tank);
                  const quantity = selectedTanks[tankId]?.quantity || 0;
                  const hasWater = tank.apiData && tank.apiData.QuantidadeDeAgua > 0;
                  const tankNumber = tank.apiData?.Tanque || 0;
                  
                  return (
                    <div key={tank.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Informações do tanque */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-slate-900 dark:text-white">
                              Tanque {tankNumber}
                            </span>
                            <Badge className={`${getCodeColor(tank.code)} text-white`}>
                              {tank.code}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <status.icon className={`w-4 h-4 ${
                              status.color === 'red' ? 'text-red-500' :
                              status.color === 'amber' ? 'text-amber-500' :
                              status.color === 'blue' ? 'text-blue-500' :
                              'text-emerald-500'
                            }`} />
                            <span className={`text-sm font-medium ${
                              status.color === 'red' ? 'text-red-700 dark:text-red-400' :
                              status.color === 'amber' ? 'text-amber-700 dark:text-amber-400' :
                              status.color === 'blue' ? 'text-blue-700 dark:text-blue-400' :
                              'text-emerald-700 dark:text-emerald-400'
                            }`}>
                              {status.label}
                            </span>
                          </div>
                          
                          {hasWater && (
                            <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                              <Droplet className="w-3 h-3" />
                              <span className="text-xs">
                                Água: {formatWaterAmount(tank.apiData?.QuantidadeDeAgua || 0)}L
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Nível e capacidade */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  status.color === 'red' ? 'bg-red-500' :
                                  status.color === 'amber' ? 'bg-amber-500' :
                                  status.color === 'blue' ? 'bg-blue-500' :
                                  'bg-emerald-500'
                                } transition-all duration-300`}
                                style={{ width: `${Math.min(status.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white min-w-0 flex-shrink-0">
                              {Math.round(status.percentage)}%
                            </span>
                          </div>
                          
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {tank.current.toLocaleString()} / {tank.capacity.toLocaleString()} L
                          </div>
                        </div>
                        
                        {/* Controles */}
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) => handleQuantityChange(station.id, tank.id, Number(e.target.value))}
                            max={tank.capacity - tank.current}
                            min={0}
                            step="1000"
                            className="flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            placeholder="Quantidade (L)"
                          />
                          
                          <div className="flex items-center space-x-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRequestFill(station.id, tank.id)}
                                    className="h-8 w-8 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
                                  >
                                    <Truck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Solicitar abastecimento</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {hasWater && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onMarkInspection(station.id, tank.id)}
                                      className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                    >
                                      <AlertTriangle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Marcar para inspeção</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewHistory(station.id, tank.id)}
                                    className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  >
                                    <Eye className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver histórico</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
        
        {filteredStations.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            Nenhuma estação encontrada para exibir.
          </div>
        )}
      </div>
    </div>
  );
}

export default StationListView;
