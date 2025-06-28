import { useState } from "react";
import { TankData } from "@/types/api";
import StationCard from "./StationCard";
import StationListView from "./StationListView";
import ViewToggle from "./ViewToggle";

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

interface StationContainerProps {
  stations: Station[];
  onTankSelect: (stationId: string, tankId: string, selected: boolean) => void;
  onQuantityChange: (stationId: string, tankId: string, quantity: number) => void;
  selectedTanks: Record<string, { selected: boolean; quantity: number }>;
}

export function StationContainer({ stations, onTankSelect, onQuantityChange, selectedTanks }: StationContainerProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  
  // Funções para ações rápidas
  const handleRequestFill = (stationId: string, tankId: string) => {
    // Implementação para solicitar abastecimento
    console.log(`Solicitando abastecimento para tanque ${tankId} do posto ${stationId}`);
    // Aqui você pode abrir um modal ou redirecionar para uma página de pedido
    // Por enquanto, vamos apenas selecionar o tanque e definir uma quantidade padrão
    onTankSelect(stationId, tankId, true);
    onQuantityChange(stationId, tankId, 1000); // 1000L como quantidade padrão
  };
  
  const handleMarkInspection = (stationId: string, tankId: string) => {
    // Implementação para marcar inspeção
    console.log(`Marcando inspeção para tanque ${tankId} do posto ${stationId}`);
    // Aqui você pode abrir um modal para agendar inspeção
    alert(`Inspeção agendada para o tanque ${tankId} do posto ${stationId}`);
  };
  
  const handleViewHistory = (stationId: string, tankId: string) => {
    // Implementação para visualizar histórico
    console.log(`Visualizando histórico do tanque ${tankId} do posto ${stationId}`);
    // Aqui você pode abrir um modal ou redirecionar para uma página de histórico
    alert(`Visualizando histórico do tanque ${tankId} do posto ${stationId}`);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho com toggle de visualização */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Postos e Tanques</h2>
        <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
      </div>

      {/* Visualização em cards ou lista */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stations.map(station => (
            <StationCard
              key={station.id}
              id={station.id}
              name={station.name}
              address={station.address}
              tanks={station.tanks}
              onTankSelect={onTankSelect}
              onQuantityChange={onQuantityChange}
              selectedTanks={selectedTanks}
            />
          ))}
        </div>
      ) : (
        <StationListView
          stations={stations}
          onTankSelect={onTankSelect}
          onQuantityChange={onQuantityChange}
          selectedTanks={selectedTanks}
          onRequestFill={handleRequestFill}
          onMarkInspection={handleMarkInspection}
          onViewHistory={handleViewHistory}
        />
      )}
    </div>
  );
}

export default StationContainer;
