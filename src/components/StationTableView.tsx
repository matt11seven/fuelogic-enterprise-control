
import { useState } from "react";
import { TankData } from "@/types/api";
import { Badge } from "./ui/badge";
import { useConfig } from "@/context/ConfigContext";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { CheckCircle, AlertTriangle, AlertCircle, Droplet, Truck, Eye, FileText } from "lucide-react";
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

interface StationTableViewProps {
  stations: Station[];
  onTankSelect: (stationId: string, tankId: string, selected: boolean) => void;
  onQuantityChange: (stationId: string, tankId: string, quantity: number) => void;
  selectedTanks: Record<string, { selected: boolean; quantity: number }>;
  onRequestFill?: (stationId: string, tankId: string) => void;
  onMarkInspection?: (stationId: string, tankId: string) => void;
  onViewHistory?: (stationId: string, tankId: string) => void;
}

export function StationTableView({ 
  stations, 
  onTankSelect, 
  onQuantityChange, 
  selectedTanks,
  onRequestFill = () => {},
  onMarkInspection = () => {},
  onViewHistory = () => {}
}: StationTableViewProps) {
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

  // Filtrar estações
  const filteredStations = selectedStation === 'all' 
    ? stations 
    : stations.filter(station => station.id === selectedStation);

  // Preparar dados para a tabela
  const tableData = filteredStations.flatMap(station => 
    station.tanks.map(tank => ({
      station,
      tank,
      tankId: `${station.id}-${tank.id}`,
      status: getTankStatus(tank),
      quantity: selectedTanks[`${station.id}-${tank.id}`]?.quantity || 0
    }))
  );
  
  // Calcular totais gerais
  const calculateTotals = () => {
    let totalOrderQuantity = 0;
    let totalFillCapacity = 0;
    let totalCurrentVolume = 0;
    let totalCapacity = 0;

    filteredStations.forEach(station => {
      station.tanks.forEach(tank => {
        const tankId = `${station.id}-${tank.id}`;
        const selectedTank = selectedTanks[tankId];
        
        if (selectedTank?.selected && selectedTank?.quantity > 0) {
          totalOrderQuantity += selectedTank.quantity;
        }
        
        totalFillCapacity += (tank.capacity - tank.current);
        totalCurrentVolume += tank.current;
        totalCapacity += tank.capacity;
      });
    });
    
    const occupancyPercentage = totalCapacity > 0 ? (totalCurrentVolume / totalCapacity) * 100 : 0;
    
    // Calcular a ocupação projetada após o pedido
    const projectedCurrentVolume = totalCurrentVolume + totalOrderQuantity;
    const projectedOccupancyPercentage = totalCapacity > 0 ? (projectedCurrentVolume / totalCapacity) * 100 : 0;

    return {
      totalOrderQuantity,
      totalFillCapacity,
      totalCurrentVolume,
      totalCapacity,
      occupancyPercentage,
      projectedCurrentVolume,
      projectedOccupancyPercentage
    };
  };
  
  const totals = calculateTotals();

  // Função para lidar com mudanças na quantidade
  const handleQuantityChange = (stationId: string, tankId: string, quantity: number) => {
    // Automaticamente seleciona o tanque se a quantidade for maior que 0
    const shouldSelect = quantity > 0;
    onTankSelect(stationId, tankId, shouldSelect);
    onQuantityChange(stationId, tankId, quantity);
  };

  return (
    <div className="space-y-4">
      {/* Totalizadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-100/80 dark:bg-blue-900/20 p-3 rounded-lg shadow-sm">
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Pedido Total</div>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {totals.totalOrderQuantity.toLocaleString()} L
          </div>
        </div>
        <div className="bg-emerald-100/80 dark:bg-emerald-900/20 p-3 rounded-lg shadow-sm">
          <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Capacidade Livre</div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {totals.totalFillCapacity.toLocaleString()} L
          </div>
        </div>
        <div className="bg-amber-100/80 dark:bg-amber-900/20 p-3 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm text-amber-600 dark:text-amber-400">Ocupação</div>
            {totals.totalOrderQuantity > 0 && (
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center">
                <span className="mr-1">Após pedido:</span>
                <span className="font-bold">{Math.round(totals.projectedOccupancyPercentage)}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mr-2 min-w-[3rem]">
              {Math.round(totals.occupancyPercentage)}%
            </div>
            <div className="flex-1 h-3 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-amber-500 dark:bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.min(totals.occupancyPercentage, 100)}%` }}
              />
              {totals.totalOrderQuantity > 0 && (
                <div 
                  className="h-full bg-blue-500 dark:bg-blue-500 opacity-70 transition-all duration-300 absolute top-0"
                  style={{ 
                    width: `${Math.min(totals.projectedOccupancyPercentage - totals.occupancyPercentage, 100)}%`, 
                    left: `${Math.min(totals.occupancyPercentage, 100)}%`
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Seletor de estação */}
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

      {/* Tabela */}
      <div className="glass-card-hover overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 dark:border-slate-700">
                <TableHead>Posto</TableHead>
                <TableHead>Tanque</TableHead>
                <TableHead>Combustível</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Atual/Capacidade</TableHead>
                <TableHead>Água</TableHead>
                <TableHead>Quantidade (L)</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map(({ station, tank, tankId, status, quantity }) => {
                const hasWater = tank.apiData && tank.apiData.QuantidadeDeAgua > 0;
                const tankNumber = tank.apiData?.Tanque || 0;
                
                return (
                  <TableRow 
                    key={tankId}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <TableCell className="font-medium text-slate-900 dark:text-white">
                      <div>
                        <div className="font-semibold">{station.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{station.address}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="font-medium text-slate-900 dark:text-white">
                        Tanque {tankNumber}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={`${getCodeColor(tank.code)} text-white`}>
                        {tank.code}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
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
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {Math.round(status.percentage)}%
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {tank.current.toLocaleString()}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          /{tank.capacity.toLocaleString()} L
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {hasWater ? (
                        <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                          <Droplet className="w-3 h-3" />
                          <span className="text-xs font-medium">
                            {formatWaterAmount(tank.apiData?.QuantidadeDeAgua || 0)}L
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(station.id, tank.id, Number(e.target.value))}
                        max={tank.capacity - tank.current}
                        min={0}
                        step="1000"
                        className="w-24 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="0"
                      />
                    </TableCell>
                    
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {tableData.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            Nenhum tanque encontrado para exibir.
          </div>
        )}
      </div>
    </div>
  );
}

export default StationTableView;
