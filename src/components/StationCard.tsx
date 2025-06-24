
import { MapPin } from "lucide-react";
import FuelTank from "./FuelTank";

interface Tank {
  id: string;
  code: string;
  type: string;
  current: number;
  capacity: number;
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
        case 'GC': return 'bg-blue-500';
        case 'GA': return 'bg-purple-500';
        case 'ET': return 'bg-green-500';
        case 'DS': return 'bg-gray-500';
        default: return 'bg-slate-500';
      }
    };

    return (
      <div key={tank.id} className="flex flex-col items-center space-y-1">
        <div className={`hex-badge ${getCodeColor()} text-white text-xs`}>
          {tank.code}
        </div>
        <div className="w-4 h-8 bg-slate-700 rounded-sm overflow-hidden">
          <div 
            className={`w-full ${getColor()} transition-all duration-500`}
            style={{ height: `${percentage}%`, marginTop: 'auto' }}
          />
        </div>
        <span className="text-xs text-slate-400">{percentage.toFixed(0)}%</span>
      </div>
    );
  };

  const hasSelectedTanks = tanks.some(tank => selectedTanks[`${id}-${tank.id}`]?.selected);

  return (
    <div className="glass-card-hover">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white">{name}</h3>
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
