import { AlertTriangle, CheckCircle, Droplet } from "lucide-react";
import { TankData } from "@/types/api";

interface Tank {
  id: string;
  code: string;
  type: string;
  current: number;
  capacity: number;
  apiData?: TankData;
}

interface StatusIndicatorsProps {
  tanks: Tank[];
  compact?: boolean;
}

export function StatusIndicators({ tanks, compact = false }: StatusIndicatorsProps) {
  // Calcular estatísticas
  const totalTanks = tanks.length;
  const criticalTanks = tanks.filter(tank => (tank.current / tank.capacity) < 0.2).length;
  const warningTanks = tanks.filter(tank => {
    const percentage = tank.current / tank.capacity;
    return percentage >= 0.2 && percentage < 0.5;
  }).length;
  const normalTanks = tanks.filter(tank => (tank.current / tank.capacity) >= 0.5).length;
  const tanksWithWater = tanks.filter(tank => tank.apiData && tank.apiData.QuantidadeDeAgua > 0).length;

  // Verificar se há tanques em cada categoria
  const hasCritical = criticalTanks > 0;
  const hasWarning = warningTanks > 0;
  const hasNormal = normalTanks > 0;
  const hasWater = tanksWithWater > 0;

  if (compact) {
    // Versão compacta para uso em cards ou listas densas
    return (
      <div className="flex items-center space-x-2">
        {hasCritical && (
          <div className="status-indicator flex items-center bg-red-900/30 text-red-400 px-2 py-1 rounded-full text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            <span>{criticalTanks}</span>
          </div>
        )}
        {hasWarning && (
          <div className="status-indicator flex items-center bg-amber-900/40 text-amber-400 px-2 py-1 rounded-full text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            <span>{warningTanks}</span>
          </div>
        )}
        {hasNormal && (
          <div className="status-indicator flex items-center bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded-full text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            <span>{normalTanks}</span>
          </div>
        )}
        {hasWater && (
          <div className="status-indicator flex items-center bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full text-xs">
            <Droplet className="w-3 h-3 mr-1" />
            <span>{tanksWithWater}</span>
          </div>
        )}
      </div>
    );
  }

  // Versão completa com barras de progresso
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">Status dos Tanques</span>
        <span className="text-slate-400">{totalTanks} total</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {/* Tanques críticos */}
        <div className="status-indicator flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${hasCritical ? 'bg-red-500' : 'bg-slate-700'}`} />
          <span className="text-xs text-slate-300">Crítico</span>
          <span className="text-xs text-red-400 ml-auto">{criticalTanks}</span>
        </div>
        
        {/* Tanques em atenção */}
        <div className="status-indicator flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${hasWarning ? 'bg-amber-500' : 'bg-slate-700'}`} />
          <span className="text-xs text-slate-300">Atenção</span>
          <span className="text-xs text-amber-400 ml-auto">{warningTanks}</span>
        </div>
        
        {/* Tanques normais */}
        <div className="status-indicator flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${hasNormal ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          <span className="text-xs text-slate-300">Normal</span>
          <span className="text-xs text-emerald-400 ml-auto">{normalTanks}</span>
        </div>
        
        {/* Tanques com água */}
        <div className="status-indicator flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${hasWater ? 'bg-blue-500' : 'bg-slate-700'}`} />
          <span className="text-xs text-slate-300">Com água</span>
          <span className="text-xs text-blue-400 ml-auto">{tanksWithWater}</span>
        </div>
      </div>
      
      {/* Barra de progresso consolidada */}
      <div className="relative h-2 overflow-hidden rounded-full mt-1">
        <div className="absolute top-0 left-0 bottom-0 w-full bg-slate-800" />
        
        {/* Segmentos da barra */}
        <div className="flex h-full">
          {hasCritical && (
            <div 
              className="h-full bg-red-500" 
              style={{ width: `${(criticalTanks / totalTanks) * 100}%` }}
            />
          )}
          {hasWarning && (
            <div 
              className="h-full bg-amber-500" 
              style={{ width: `${(warningTanks / totalTanks) * 100}%` }}
            />
          )}
          {hasNormal && (
            <div 
              className="h-full bg-emerald-500" 
              style={{ width: `${(normalTanks / totalTanks) * 100}%` }}
            />
          )}
        </div>
        
        {/* Indicadores de água (sobrepostos) */}
        {hasWater && (
          <div className="absolute top-0 right-0 bottom-0 flex items-center justify-end px-1">
            <div className="flex space-x-0.5">
              {Array.from({ length: Math.min(tanksWithWater, 5) }).map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
              ))}
              {tanksWithWater > 5 && (
                <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatusIndicators;
