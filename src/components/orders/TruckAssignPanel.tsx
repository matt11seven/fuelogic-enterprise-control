import { useState, useEffect } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllTrucks } from "@/services/truck-api";
import { Truck as TruckType } from "@/types/truck";
import ordersApiService from "@/services/orders-api";
import { toast } from "@/hooks/use-toast";

interface TruckAssignPanelProps {
  orderId: number;
  currentTruckId: number | null;
  currentTruckName?: string;
  onAssigned: () => void;
}

export function TruckAssignPanel({ orderId, currentTruckId, currentTruckName, onAssigned }: TruckAssignPanelProps) {
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(currentTruckId);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getAllTrucks().then((data) => setTrucks(data.filter((t) => t.status === 'active'))).catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      await ordersApiService.assignTruck(orderId, selectedId);
      toast({ title: "Caminhão vinculado com sucesso" });
      onAssigned();
    } catch {
      toast({ title: "Erro ao vincular caminhão", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Truck className="w-4 h-4 text-slate-500 shrink-0" />
      <select
        value={selectedId ?? ""}
        onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
        className="flex-1 bg-slate-800/50 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
      >
        <option value="">Selecionar caminhão...</option>
        {trucks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} — {t.driver_name} ({t.license_plate})
          </option>
        ))}
      </select>
      <Button size="sm" onClick={handleSave} disabled={isSaving || !selectedId}>
        {isSaving ? "..." : "Ok"}
      </Button>
    </div>
  );
}
