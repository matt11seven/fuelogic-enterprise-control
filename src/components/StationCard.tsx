
import { useState } from "react";
import { TankData } from "@/types/api";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useConfig } from "@/context/ConfigContext";
import { CheckCircle, AlertTriangle, AlertCircle, Droplet } from "lucide-react";

interface Tank {
  id: string;
  code: string;
  type: string;
  current: number;
  capacity: number;
  apiData?: TankData;
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

export function StationCard({ 
  id, 
  name, 
  address, 
  tanks, 
  onTankSelect, 
  onQuantityChange, 
  selectedTanks 
}: StationCardProps) {
  const { thresholds } = useConfig();

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

  // Função para lidar com mudanças na quantidade
  const handleQuantityChange = (tankId: string, quantity: number) => {
    // Automaticamente seleciona o tanque se a quantidade for maior que 0
    const shouldSelect = quantity > 0;
    onTankSelect(id, tankId, shouldSelect);
    onQuantityChange(id, tankId, quantity);
  };

  return (
    <Card className="glass-card-hover">
      <CardHeader>
        <CardTitle className="text-lg text-white">{name}</CardTitle>
        <p className="text-sm text-slate-300">{address}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {tanks.map(tank => {
          const tankId = `${id}-${tank.id}`;
          const status = getTankStatus(tank);
          const quantity = selectedTanks[tankId]?.quantity || 0;
          const hasWater = tank.apiData && tank.apiData.QuantidadeDeAgua > 0;
          const tankNumber = tank.apiData?.Tanque || 0;
          
          return (
            <div key={tank.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
              {/* Cabeçalho do tanque */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-white">Tanque {tankNumber}</span>
                  <Badge className={`${getCodeColor(tank.code)} text-white`}>
                    {tank.code}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <status.icon className={`w-4 h-4 ${
                    status.color === 'red' ? 'text-red-400' :
                    status.color === 'amber' ? 'text-amber-400' :
                    status.color === 'blue' ? 'text-blue-400' :
                    'text-emerald-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    status.color === 'red' ? 'text-red-400' :
                    status.color === 'amber' ? 'text-amber-400' :
                    status.color === 'blue' ? 'text-blue-400' :
                    'text-emerald-400'
                  }`}>
                    {status.label}
                  </span>
                </div>
              </div>
              
              {/* Barra de progresso */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">
                    {tank.current.toLocaleString()} / {tank.capacity.toLocaleString()} L
                  </span>
                  <span className="text-slate-300">
                    {Math.round(status.percentage)}%
                  </span>
                </div>
                
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
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
              </div>
              
              {/* Água detectada */}
              {hasWater && (
                <div className="flex items-center space-x-2 text-blue-400">
                  <Droplet className="w-4 h-4" />
                  <span className="text-sm">
                    Água detectada: {tank.apiData?.QuantidadeDeAgua?.toLocaleString(undefined, {maximumFractionDigits: 1})}L
                  </span>
                </div>
              )}
              
              {/* Campo de quantidade */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-slate-300 min-w-0 flex-shrink-0">
                  Quantidade (L):
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(tank.id, Number(e.target.value))}
                  max={tank.capacity - tank.current}
                  min={0}
                  step="1000"
                  className="flex-1 px-3 py-2 text-sm border border-slate-600 rounded bg-slate-800 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0"
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default StationCard;
