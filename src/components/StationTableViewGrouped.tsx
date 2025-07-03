import { useState, useMemo, useEffect, useRef } from "react";
import { getFuelColor } from "../utils/fuelColors";
import { getProductCode } from "../utils/fuelCodes";
import { TankData } from "@/types/api";
import { Badge } from "./ui/badge";
import { useConfig } from "@/context/ConfigContext";
import OccupancyBar from './OccupancyBar';
import { useMockData } from "@/context/MockDataContext";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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
  expectedSales?: number;
  expectedDelivery?: number;
}

interface Station {
  id: string;
  name: string;
  address: string;
  tanks: Tank[];
}

interface StationTableViewGroupedProps {
  stations: Station[];
  onTankSelect: (stationId: string, tankId: string, selected: boolean) => void;
  onQuantityChange: (stationId: string, tankId: string, quantity: number) => void;
  selectedTanks: Record<string, { selected: boolean; quantity: number }>;
  onRequestFill?: (stationId: string, tankId: string) => void;
  onMarkInspection?: (stationId: string, tankId: string) => void;
  onViewHistory?: (stationId: string, tankId: string) => void;
}

export function StationTableViewGrouped({ 
  stations, 
  onTankSelect, 
  onQuantityChange, 
  selectedTanks,
  onRequestFill = () => {},
  onMarkInspection = () => {},
  onViewHistory = () => {}
}: StationTableViewGroupedProps) {
  const { thresholds } = useConfig();
  const [selectedStation, setSelectedStation] = useState<string>('all');

  // Usar o utilitário centralizado para cores de combustível

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
  
  // Filtrar estações
  const filteredStations = selectedStation === 'all' 
    ? stationsWithMockData 
    : stationsWithMockData.filter(station => station.id === selectedStation);

  // Calcular totais gerais
  const calculateTotals = () => {
    let totalOrderQuantity = 0;
    let totalFillCapacity = 0;
    let totalCurrentVolume = 0;
    let totalExpectedSales = 0;
    let totalExpectedDelivery = 0;

    filteredStations.forEach(station => {
      station.tanks.forEach(tank => {
        const tankId = `${station.id}-${tank.id}`;
        const selectedTank = selectedTanks[tankId];
        
        if (selectedTank?.quantity > 0) {
          totalOrderQuantity += selectedTank.quantity;
        }
        
        totalFillCapacity += (tank.capacity - tank.current);
        totalCurrentVolume += tank.current;
        totalExpectedSales += tank.expectedSales || 0;
        totalExpectedDelivery += tank.expectedDelivery || 0;
      });
    });

    const totalCapacity = filteredStations.reduce((acc, station) => 
      acc + station.tanks.reduce((tankAcc, tank) => tankAcc + tank.capacity, 0), 0
    );
    
    const occupancyPercentage = totalCapacity > 0 ? (totalCurrentVolume / totalCapacity) * 100 : 0;
    
    // Calcular a ocupação projetada após o pedido
    const projectedCurrentVolume = totalCurrentVolume + totalOrderQuantity;
    const projectedOccupancyPercentage = totalCapacity > 0 ? (projectedCurrentVolume / totalCapacity) * 100 : 0;
    
    // Calcular a ocupação após recebimento (atual + recebimento)
    const volumeAfterDelivery = totalCurrentVolume + totalExpectedDelivery;
    const occupancyAfterDeliveryPercentage = totalCapacity > 0 ? (volumeAfterDelivery / totalCapacity) * 100 : 0;
    
    // Calcular a projeção final (após recebimento + pedido)
    const projectedWithSalesAndDelivery = volumeAfterDelivery + totalOrderQuantity;
    const finalOccupancyPercentage = totalCapacity > 0 ? (projectedWithSalesAndDelivery / totalCapacity) * 100 : 0;

    return {
      totalOrderQuantity,
      totalFillCapacity,
      totalCurrentVolume,
      totalCapacity,
      occupancyPercentage,
      volumeAfterDelivery,
      occupancyAfterDeliveryPercentage,
      projectedCurrentVolume,
      projectedOccupancyPercentage,
      totalExpectedSales,
      totalExpectedDelivery,
      projectedWithSalesAndDelivery,
      finalOccupancyPercentage
    };
  };

  // Calcular totais por estação
  const getStationTotals = (station: Station) => {
    let orderQuantity = 0;
    let fillCapacity = 0;
    let currentVolume = 0;
    let totalCapacity = 0;
    let tanksWithQuantity = 0;
    let expectedSales = 0;
    let expectedDelivery = 0;

    station.tanks.forEach(tank => {
      const tankId = `${station.id}-${tank.id}`;
      const selectedTank = selectedTanks[tankId];
      
      if (selectedTank?.quantity > 0) {
        orderQuantity += selectedTank.quantity;
        tanksWithQuantity++;
      }
      
      fillCapacity += (tank.capacity - tank.current);
      currentVolume += tank.current;
      totalCapacity += tank.capacity;
      expectedSales += tank.expectedSales || 0;
      expectedDelivery += tank.expectedDelivery || 0;
    });
    
    const occupancyPercentage = totalCapacity > 0 ? (currentVolume / totalCapacity) * 100 : 0;
    
    // Calcular a ocupação projetada após o pedido
    const projectedCurrentVolume = currentVolume + orderQuantity;
    const projectedOccupancyPercentage = totalCapacity > 0 ? (projectedCurrentVolume / totalCapacity) * 100 : 0;
    
    // Calcular a ocupação após recebimento
    const volumeAfterDelivery = currentVolume + expectedDelivery;
    const occupancyAfterDeliveryPercentage = totalCapacity > 0 ? (volumeAfterDelivery / totalCapacity) * 100 : 0;
    
    // Calcular a projeção final (após recebimento + pedido)
    const projectedWithSalesAndDelivery = volumeAfterDelivery + orderQuantity - expectedSales;
    const finalOccupancyPercentage = totalCapacity > 0 ? (projectedWithSalesAndDelivery / totalCapacity) * 100 : 0;

    return {
      orderQuantity,
      fillCapacity,
      currentVolume,
      totalCapacity,
      tanksWithQuantity,
      totalTanks: station.tanks.length,
      expectedSales,
      expectedDelivery,
      occupancyPercentage,
      projectedOccupancyPercentage,
      volumeAfterDelivery,
      occupancyAfterDeliveryPercentage,
      projectedWithSalesAndDelivery,
      finalOccupancyPercentage
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Seletor de estação */}
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
          <div className="bg-purple-100 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
            <span className="text-purple-700 dark:text-purple-300 font-medium">
              Venda Prevista: {totals.totalExpectedSales.toLocaleString()}L
            </span>
          </div>
          <div className="bg-indigo-100 dark:bg-indigo-900/20 px-3 py-2 rounded-lg">
            <span className="text-indigo-700 dark:text-indigo-300 font-medium">
              Recebimento: {totals.totalExpectedDelivery.toLocaleString()}L
            </span>
          </div>
          <div className="bg-amber-100/80 dark:bg-amber-900/20 px-3 py-2 rounded-lg relative">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ocupação</span>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                {Math.round(totals.occupancyPercentage)}%
              </span>
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
      </div>

      {/* Tabelas agrupadas por estação */}
      <div className="space-y-6">
        {filteredStations.map(station => {
          const stationTotals = getStationTotals(station);
          
          return (
            <Card key={station.id} className="glass-card-hover">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      {station.name}
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {station.address}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded">
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        Pedido: {stationTotals.orderQuantity.toLocaleString()}L
                      </span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded">
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                        Disponível: {stationTotals.fillCapacity.toLocaleString()}L
                      </span>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded">
                      <span className="text-purple-700 dark:text-purple-300 font-medium">
                        Venda: {stationTotals.expectedSales.toLocaleString()}L
                      </span>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded">
                      <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                        Recebimento: {stationTotals.expectedDelivery.toLocaleString()}L
                      </span>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      <span className="text-slate-600 dark:text-slate-400 text-xs">
                        {stationTotals.tanksWithQuantity}/{stationTotals.totalTanks} com pedido
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 dark:border-slate-700">
                        <TableHead>Tanque</TableHead>
                        <TableHead>Combustível</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Nível</TableHead>
                        <TableHead>Atual/Capacidade</TableHead>
                        <TableHead>Venda Prevista</TableHead>
                        <TableHead>Recebimento</TableHead>
                        <TableHead>Total Final</TableHead>
                        <TableHead>Quantidade (L)</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {station.tanks.map(tank => {
                        const tankId = `${station.id}-${tank.id}`;
                        const status = getTankStatus(tank);
                        const quantity = selectedTanks[tankId]?.quantity || 0;
                        const hasWater = tank.apiData && tank.apiData.QuantidadeDeAgua > 0;
                        const tankNumber = tank.apiData?.Tanque || 0;
                        
                        return (
                          <TableRow 
                            key={tankId}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                          >
                            <TableCell>
                              <span className="font-medium text-slate-900 dark:text-white">
                                Tanque {tankNumber}
                              </span>
                            </TableCell>
                            
                            <TableCell>
                              <Badge className={`${getFuelColor(getProductCode(tank.code))} text-white`}>
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
                              <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                {(tank.expectedSales || 0).toLocaleString()} L
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                {(tank.expectedDelivery || 0).toLocaleString()} L
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="text-sm font-medium text-teal-700 dark:text-teal-300">
                                {(tank.current + (tank.expectedDelivery || 0) - (tank.expectedSales || 0) + quantity).toLocaleString()} L
                              </div>
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

export default StationTableViewGrouped;
