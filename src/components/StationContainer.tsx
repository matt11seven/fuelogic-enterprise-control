import { useState } from "react";
import { TankData } from "@/types/api";
import StationCard from "./StationCard";
import StationListView from "./StationListView";
import StationTableView from "./StationTableView";
import ViewToggle from "./ViewToggle";
import { sendInspectionAlert } from "@/services/inspection-api";
import { toast } from "@/hooks/use-toast";

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
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'table'>('cards');
  
  // Funções para ações rápidas
  const handleRequestFill = (stationId: string, tankId: string) => {
    // Implementação para solicitar abastecimento
    console.log(`Solicitando abastecimento para tanque ${tankId} do posto ${stationId}`);
    // Aqui você pode abrir um modal ou redirecionar para uma página de pedido
    // Por enquanto, vamos apenas selecionar o tanque e definir uma quantidade padrão
    onTankSelect(stationId, tankId, true);
    onQuantityChange(stationId, tankId, 1000); // 1000L como quantidade padrão
  };
  
  const handleMarkInspection = async (stationId: string, tankId: string) => {
    // Buscar a estação e o tanque pelos seus IDs
    const station = stations.find(s => s.id === stationId);
    if (!station) return;
    
    const tank = station.tanks.find(t => t.id === tankId);
    if (!tank || !tank.apiData) return;
    
    // Verificar se o tanque tem dados de API e água detectada
    if (tank.apiData.QuantidadeDeAgua && tank.apiData.QuantidadeDeAgua > 0) {
      try {
        toast({
          title: "Enviando alerta de inspeção...",
          description: "Enviando notificação para os webhooks configurados.",
        });
        
        // Enviar o alerta de inspeção através da API
        const response = await sendInspectionAlert([tank.apiData]);
        
        // Mostrar resultado do envio
        if (response.success) {
          const sucessos = response.resultados.filter(r => r.success).length;
          const total = response.resultados.length;
          
          toast({
            title: "Alerta de inspeção enviado",
            description: `Entregue com sucesso para ${sucessos} de ${total} webhooks configurados`,
            variant: "default"
          });
        } else {
          toast({
            title: "Falha parcial no envio",
            description: response.message,
            variant: "destructive"
          });
        }
      } catch (error: any) {
        console.error("Erro ao enviar alerta de inspeção:", error);
        toast({
          title: "Erro ao enviar alerta",
          description: error.message || "Não foi possível enviar o alerta de inspeção",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Alerta não enviado",
        description: "Este tanque não tem água detectada para gerar um alerta.",
        variant: "destructive"
      });
    }
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

      {/* Visualização em cards, lista ou tabela */}
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
      ) : viewMode === 'list' ? (
        <StationListView
          stations={stations}
          onTankSelect={onTankSelect}
          onQuantityChange={onQuantityChange}
          selectedTanks={selectedTanks}
          onRequestFill={handleRequestFill}
          onMarkInspection={handleMarkInspection}
          onViewHistory={handleViewHistory}
        />
      ) : (
        <StationTableView
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
