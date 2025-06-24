
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import MetricsCards from "@/components/MetricsCards";
import StationCard from "@/components/StationCard";
import OrderButton from "@/components/OrderButton";

const Index = () => {
  const [selectedTanks, setSelectedTanks] = useState<Record<string, { selected: boolean; quantity: number }>>({});

  // Mock data for demonstration
  const stations = [
    {
      id: "station-1",
      name: "Posto Central",
      address: "Av. Paulista, 1000 - São Paulo, SP",
      tanks: [
        { id: "tank-1", code: "GC", type: "Gasolina Comum", current: 2500, capacity: 15000 },
        { id: "tank-2", code: "GA", type: "Gasolina Aditivada", current: 8500, capacity: 15000 },
        { id: "tank-3", code: "ET", type: "Etanol", current: 12000, capacity: 20000 },
        { id: "tank-4", code: "DS", type: "Diesel S10", current: 3200, capacity: 25000 }
      ]
    },
    {
      id: "station-2", 
      name: "Posto Norte",
      address: "Rod. Fernão Dias, Km 45 - Atibaia, SP",
      tanks: [
        { id: "tank-5", code: "GC", type: "Gasolina Comum", current: 7800, capacity: 12000 },
        { id: "tank-6", code: "GA", type: "Gasolina Aditivada", current: 4500, capacity: 12000 },
        { id: "tank-7", code: "ET", type: "Etanol", current: 15000, capacity: 18000 },
        { id: "tank-8", code: "DS", type: "Diesel S10", current: 8900, capacity: 20000 }
      ]
    },
    {
      id: "station-3",
      name: "Posto Sul", 
      address: "Av. Washington Luís, 2500 - Santos, SP",
      tanks: [
        { id: "tank-9", code: "GC", type: "Gasolina Comum", current: 11200, capacity: 14000 },
        { id: "tank-10", code: "GA", type: "Gasolina Aditivada", current: 6800, capacity: 14000 },
        { id: "tank-11", code: "ET", type: "Etanol", current: 1800, capacity: 16000 },
        { id: "tank-12", code: "DS", type: "Diesel S10", current: 18500, capacity: 22000 }
      ]
    }
  ];

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
            <h2 className="text-2xl font-bold text-white">Postos Monitorados</h2>
            <div className="text-sm text-slate-400">
              {stations.length} postos ativos
            </div>
          </div>
          
          {stations.map(station => (
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
