
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
}

const FuelTank = ({ code, type, current, capacity, isSelected, onSelect, quantity, onQuantityChange }: FuelTankProps) => {
  const percentage = (current / capacity) * 100;
  const available = capacity - current;
  
  const getStatus = () => {
    if (percentage < 20) return { color: 'red', label: 'Crítico', glow: 'glow-red', animate: 'animate-pulse-emerald' };
    if (percentage < 50) return { color: 'amber', label: 'Atenção', glow: 'glow-amber', animate: '' };
    return { color: 'emerald', label: 'OK', glow: 'glow-emerald', animate: '' };
  };

  const status = getStatus();
  
  const getCodeColor = () => {
    switch (code) {
      case 'GC': return 'bg-blue-500';
      case 'GA': return 'bg-purple-500';
      case 'ET': return 'bg-green-500';
      case 'DS': return 'bg-gray-500';
      default: return 'bg-slate-500';
    }
  };

  const getProgressColor = () => {
    switch (status.color) {
      case 'red': return 'bg-gradient-to-r from-red-600 to-red-400';
      case 'amber': return 'bg-gradient-to-r from-amber-600 to-amber-400';
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
        <div className="fuel-progress mb-1">
          <div 
            className={`fuel-progress-bar ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          />
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
