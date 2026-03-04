import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ordersApiService from "@/services/orders-api";
import { toast } from "@/hooks/use-toast";

interface DeliveryEstimatePanelProps {
  orderId: number;
  currentEstimate: string | null;
  onUpdated: () => void;
}

export function DeliveryEstimatePanel({ orderId, currentEstimate, onUpdated }: DeliveryEstimatePanelProps) {
  const defaultValue = currentEstimate
    ? new Date(currentEstimate).toISOString().slice(0, 16)
    : "";
  const [value, setValue] = useState(defaultValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!value) return;
    setIsSaving(true);
    try {
      await ordersApiService.setDeliveryEstimate(orderId, new Date(value).toISOString());
      toast({ title: "Previsão de entrega salva" });
      onUpdated();
    } catch {
      toast({ title: "Erro ao salvar previsão", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 bg-slate-800/50 border-slate-700 text-sm"
      />
      <Button size="sm" onClick={handleSave} disabled={isSaving || !value}>
        {isSaving ? "..." : "Salvar"}
      </Button>
    </div>
  );
}
