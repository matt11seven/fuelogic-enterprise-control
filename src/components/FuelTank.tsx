
import { useState } from "react";
import { getFuelColor } from '../utils/fuelColors';
import { getProductCode } from '../utils/fuelCodes';
import { useConfig } from "@/context/ConfigContext";
import { Droplets } from "lucide-react";

interface FuelTankProps {
  code: string;
  type: string;
  current: number;
  capacity: number;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  waterAmount?: number; // Quantidade de água detectada no tanque
}

const FuelTank = ({ code, type, current, capacity, isSelected, onSelect, quantity, onQuantityChange, waterAmount = 0 }: FuelTankProps) => {
  // Obter os thresholds configurados do contexto global
  const { thresholds } = useConfig();
  const percentage = (current / capacity) * 100;
  const available = capacity - current;
  
  const getStatus = () => {
    // Priorizar alerta de água sobre outros status
    if (waterAmount > 0) return { color: 'blue', label: 'Alerta', glow: 'glow-blue', animate: 'animate-pulse' };
    
    // Status baseados no nível de combustível usando thresholds configurados
    if (percentage < thresholds.threshold_critico) return { color: 'red', label: 'Crítico', glow: 'glow-red', animate: 'animate-pulse-emerald' };
    if (percentage < thresholds.threshold_atencao) return { color: 'amber', label: 'Atenção', glow: 'glow-amber', animate: '' };
    return { color: 'emerald', label: 'Operacional', glow: 'glow-emerald', animate: '' };
  };

  const status = getStatus();
  
  // Usar o utilitário centralizado para cores de combustível

  const getProgressColor = () => {
    switch (status.color) {
      case 'red': return 'bg-gradient-to-r from-red-600 to-red-400';
      case 'amber': return 'bg-gradient-to-r from-amber-600 to-amber-400';
      case 'blue': return 'bg-gradient-to-r from-blue-600 to-blue-400';
      default: return 'bg-gradient-to-r from-emerald-600 to-emerald-400';
    }
  };

  return (
    <div className="relative">
      {/* Cartão principal do tanque */}
      <div className={`glass-card-hover p-4 ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-900/20' : ''} ${status.animate} relative overflow-visible`}>
        
        {/* Indicador de água - posicionado de forma elegante */}
        {waterAmount > 0 && (
          <div className="absolute -top-2 -right-2 z-20">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-md animate-pulse"></div>
              
              {/* Main water indicator */}
              <div className="relative bg-gradient-to-br from-blue-400 to-blue-600 rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-blue-300/50 backdrop-blur-sm">
                <Droplets className="w-4 h-4 text-white drop-shadow-sm" />
              </div>
              
              {/* Tooltip badge */}
              <div className="absolute -bottom-8 -right-4 bg-blue-900/90 backdrop-blur-sm text-blue-100 text-xs px-2 py-1 rounded-md shadow-lg border border-blue-400/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                {waterAmount.toLocaleString()}L água
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-blue-900/90"></div>
              </div>
            </div>
          </div>
        )}

        <div className={`${waterAmount > 0 ? 'group' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <input 
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelect(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-slate-800 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
              />
              <div className={`hex-badge ${getFuelColor(getProductCode(code))} text-white font-bold`}>
                {code}
              </div>
              <div>
                <p className="text-white font-semibold">{type}</p>
                <p className={`text-xs text-${status.color}-400 font-medium`}>{status.label}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-white font-bold">{current.toLocaleString()}L</p>
              <p className="text-slate-400 text-sm">de {capacity.toLocaleString()}L</p>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center mb-1 space-x-2">
              {/* Ícone representando o tanque */}
              <div className="w-6 h-8 border border-slate-600 rounded-sm relative">
                {/* Nível de combustível */}
                <div 
                  className={`w-full ${getProgressColor()} absolute bottom-0 left-0 right-0 transition-all duration-500 overflow-hidden`}
                  style={{ height: `${percentage}%` }}
                />
              </div>
              
              {/* Barra de progresso horizontal */}
              <div className="fuel-progress flex-1 relative h-2 overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-full bg-slate-800/50 rounded-full" />
                <div 
                  className={`absolute top-0 left-0 bottom-0 ${getProgressColor()} rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{percentage.toFixed(1)}%</span>
              <span className="text-slate-400">Disponível: {available.toLocaleString()}L</span>
            </div>
          </div>

          {isSelected && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Quantidade para Pedido (L)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => onQuantityChange(Number(e.target.value))}
                max={available}
                min={0}
                className="w-full px-3 py-2 rounded-md bg-slate-800/80 border border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FuelTank;
