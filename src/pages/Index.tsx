import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import MetricsCards from "@/components/MetricsCards";
import StationContainer from "@/components/StationContainer";
import OrderButton from "@/components/OrderButton";
import FuelTank from "@/components/FuelTank";
import PurchaseSuggestionModal from "@/components/PurchaseSuggestionModal";
import { useTankData } from "@/hooks/use-tank-data";
import { Loader2, AlertTriangle, AlertCircle, CheckCircle, Droplet } from "lucide-react";

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
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Header />
        
        <MetricsCards stations={stations} />
        
        <div className="space-y-6 mt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-emerald-400">Postos Monitorados</h2>
              <PurchaseSuggestionModal stations={stations} />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-slate-900 dark:text-slate-400 flex items-center gap-1">
                  <Droplet className="h-3 w-3" /> Alerta
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-slate-900 dark:text-slate-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Crítico
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm text-slate-900 dark:text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Atenção
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-slate-900 dark:text-slate-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Operacional
                </span>
              </div>
            </div>
            <div className="text-sm text-slate-900 dark:text-slate-400">
              {stations ? `${stations.length} postos ativos • ${stations.reduce((total, station) => total + station.tanks.length, 0)} tanques monitorados` : 'Carregando...'}
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
          ) : (
            <StationContainer
              stations={stations || []}
              onTankSelect={handleTankSelect}
              onQuantityChange={handleQuantityChange}
              selectedTanks={selectedTanks}
            />
          )}
        </div>

        {selectedCount > 0 && (
          <OrderButton 
            selectedCount={selectedCount} 
            totalLiters={Object.values(selectedTanks)
              .filter(tank => tank.selected)
              .reduce((total, tank) => total + tank.quantity, 0)
            }
            onProcessOrder={handleProcessOrder}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
