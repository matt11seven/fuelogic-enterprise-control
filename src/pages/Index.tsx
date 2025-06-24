
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import MetricsCards from "@/components/MetricsCards";
import StationCard from "@/components/StationCard";
import OrderButton from "@/components/OrderButton";
import { useTankData } from "@/hooks/use-tank-data";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [selectedTanks, setSelectedTanks] = useState<Record<string, { selected: boolean; quantity: number }>>({});
  
  // Buscar dados reais dos tanques da API
  const { data: stations, isLoading, error } = useTankData();

  const handleTankSelect = (stationId: string, tankId: string, selected: boolean) => {
    const key = `${stationId}-${tankId}`;
    setSelectedTanks(prev => ({
      ...prev,
      [key]: {
        selected,
        quantity: selected ? prev[key]?.quantity || 0 : 0
      }
    }));
  };

  const handleQuantityChange = (stationId: string, tankId: string, quantity: number) => {
    const key = `${stationId}-${tankId}`;
    setSelectedTanks(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        quantity
      }
    }));
  };

  const handleProcessOrder = () => {
    const selectedCount = Object.values(selectedTanks).filter(tank => tank.selected).length;
    const totalLiters = Object.values(selectedTanks)
      .filter(tank => tank.selected)
      .reduce((total, tank) => total + tank.quantity, 0);

    toast({
      title: "Pedido Processado com Sucesso!",
      description: `${selectedCount} tanques selecionados - Total: ${totalLiters.toLocaleString()}L`,
    });

    // Reset selections
    setSelectedTanks({});
  };

  const selectedCount = Object.values(selectedTanks).filter(tank => tank.selected).length;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Header />
        <MetricsCards />
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-emerald-400">Postos Monitorados</h2>
            <div className="text-sm text-slate-400">
              {stations ? `${stations.length} postos ativos` : 'Carregando...'}
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-4 text-slate-400">Carregando dados dos tanques...</p>
            </div>
          ) : error ? (
            <div className="glass-card p-6 text-center">
              <p className="text-red-400 font-medium mb-2">Erro ao carregar dados</p>
              <p className="text-slate-400 text-sm">
                Não foi possível obter informações dos tanques. Por favor, tente novamente mais tarde.
              </p>
              <p className="text-slate-500 text-xs mt-4">{(error as Error).message}</p>
            </div>
          ) : stations?.map(station => (
            <StationCard
              key={station.id}
              id={station.id}
              name={station.name}
              address={station.address}
              tanks={station.tanks}
              onTankSelect={handleTankSelect}
              onQuantityChange={handleQuantityChange}
              selectedTanks={selectedTanks}
            />
          ))}
        </div>

        <OrderButton 
          selectedCount={selectedCount}
          onProcessOrder={handleProcessOrder}
        />
      </div>
    </div>
  );
};

export default Index;
