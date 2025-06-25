
import { useState } from "react";

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
  const percentage = (current / capacity) * 100;
  const available = capacity - current;
  
  const getStatus = () => {
    // Priorizar alerta de água sobre outros status
    if (waterAmount > 0) return { color: 'blue', label: 'Alerta', glow: 'glow-blue', animate: 'animate-pulse' };
    
    // Status baseados no nível de combustível
    if (percentage < 20) return { color: 'red', label: 'Crítico', glow: 'glow-red', animate: 'animate-pulse-emerald' };
    if (percentage < 50) return { color: 'amber', label: 'Atenção', glow: 'glow-amber', animate: '' };
    return { color: 'emerald', label: 'Operacional', glow: 'glow-emerald', animate: '' };
  };

  const status = getStatus();
  
  const getCodeColor = () => {
    switch (code) {
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

  const getProgressColor = () => {
    switch (status.color) {
      case 'red': return 'bg-gradient-to-r from-red-600 to-red-400';
      case 'amber': return 'bg-gradient-to-r from-amber-600 to-amber-400';
      case 'blue': return 'bg-gradient-to-r from-blue-600 to-blue-400';
      default: return 'bg-gradient-to-r from-emerald-600 to-emerald-400';
    }
  };

  return (
    <div className={`glass-card-hover p-4 ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-900/20' : ''} ${status.animate}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 text-emerald-600 bg-slate-800 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
          />
          <div className={`hex-badge ${getCodeColor()} text-white font-bold`}>
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
          <div className="w-6 h-8 border border-slate-600 rounded-sm relative overflow-hidden">
            {/* Nível de combustível */}
            <div 
              className={`w-full ${getProgressColor()} absolute bottom-0 left-0 right-0 transition-all duration-500`}
              style={{ height: `${percentage}%` }}
            />
            {/* Ícone de água quando detectada */}
            {waterAmount > 0 && (
              <div 
                className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
                style={{ height: '30%' }}
                title={`Água detectada: ${waterAmount.toLocaleString()}L`}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#38bdf8" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-3 h-3 drop-shadow-md"
                >
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                </svg>
              </div>
            )}
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
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Digite a quantidade"
          />
        </div>
      )}
    </div>
  );
};

export default FuelTank;
