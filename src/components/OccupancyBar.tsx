import { FC } from "react";

interface OccupancyBarProps {
  // Valores de ocupação
  currentOccupancy: number;       // Ocupação atual
  afterDeliveryOccupancy: number; // Ocupação após recebimento
  finalProjectionOccupancy: number; // Projeção final (após recebimento + pedido)
  
  // Opcional - personalização
  height?: string;                // Altura da barra
  showLegends?: boolean;          // Mostrar legendas
  legendClassName?: string;       // Classes para as legendas
}

export const OccupancyBar: FC<OccupancyBarProps> = ({
  currentOccupancy,
  afterDeliveryOccupancy,
  finalProjectionOccupancy,
  height = "h-5",
  showLegends = true,
  legendClassName = "text-xs",
}) => {
  // Garantir que os valores estejam dentro dos limites (0-100)
  const safeCurrentOccupancy = Math.min(Math.max(currentOccupancy, 0), 100);
  const safeAfterDeliveryOccupancy = Math.min(Math.max(afterDeliveryOccupancy, 0), 100);
  const safeFinalProjectionOccupancy = Math.min(Math.max(finalProjectionOccupancy, 0), 100);
  
  return (
    <div className="w-full">
      {/* Barra única com todas as projeções */}
      <div className={`${height} bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative mb-2`}>
        {/* Segmento 1: Ocupação atual (começo da barra) */}
        <div 
          className="h-full bg-amber-500 dark:bg-amber-500 transition-all duration-300 absolute"
          style={{ 
            width: `${safeCurrentOccupancy}%`, 
            left: '0%'
          }}
        />
        
        {/* Segmento 2: Incremento após recebimento (posicionado após a ocupação atual) */}
        {safeAfterDeliveryOccupancy > safeCurrentOccupancy && (
          <div 
            className="h-full bg-indigo-500 dark:bg-indigo-500 transition-all duration-300 absolute"
            style={{ 
              width: `${safeAfterDeliveryOccupancy - safeCurrentOccupancy}%`, 
              left: `${safeCurrentOccupancy}%`,
            }}
          />
        )}
        
        {/* Segmento 3: Incremento projeção final (posicionado após o recebimento) */}
        {safeFinalProjectionOccupancy > safeAfterDeliveryOccupancy && (
          <div 
            className="h-full bg-purple-500 dark:bg-purple-500 transition-all duration-300 absolute"
            style={{ 
              width: `${safeFinalProjectionOccupancy - safeAfterDeliveryOccupancy}%`,
              left: `${safeAfterDeliveryOccupancy}%`,
            }}
          />
        )}
      </div>
      
      {/* Legendas */}
      {showLegends && (
        <div className={`flex items-center justify-between ${legendClassName}`}>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>
            <span className="text-amber-700 dark:text-amber-300">Atual: {Math.round(safeCurrentOccupancy)}%</span>
          </div>
          
          {safeAfterDeliveryOccupancy > safeCurrentOccupancy && (
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mr-1"></div>
              <span className="text-indigo-700 dark:text-indigo-300">Após recebimento: {Math.round(safeAfterDeliveryOccupancy)}%</span>
            </div>
          )}
          
          {safeFinalProjectionOccupancy > safeAfterDeliveryOccupancy && (
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-purple-500 mr-1"></div>
              <span className="text-purple-700 dark:text-purple-300">Projeção final: {Math.round(safeFinalProjectionOccupancy)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OccupancyBar;
