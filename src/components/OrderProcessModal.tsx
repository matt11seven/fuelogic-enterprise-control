import React, { useState } from "react";
import { CopyIcon, Brain, CheckIcon, Truck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import webhookApi from "@/services/webhook-api";
import { Station } from "@/hooks/use-tank-data";

interface OrderProcessModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedTanks: Record<string, { selected: boolean; quantity: number }>;
  stations: Station[] | undefined;
  onProcessOrder: () => void;
}

export default function OrderProcessModal({
  open,
  setOpen,
  selectedTanks,
  stations,
  onProcessOrder,
}: OrderProcessModalProps): JSX.Element {
  const [isSendingToSophia, setIsSendingToSophia] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const selectedCount = Object.values(selectedTanks).filter(tank => tank.selected).length;
  const totalLiters = Object.values(selectedTanks)
    .filter(tank => tank.selected)
    .reduce((total, tank) => total + tank.quantity, 0);

  // This function was moved and refactored below

  // Copy to clipboard functionality
  const handleCopyToClipboard = async () => {
    // Force regeneration of the order text to ensure it's complete
    const text = formatOrderText();
    console.log("Clipboard text being copied:", text);
    console.log("Selected tanks count:", selectedCount);
    console.log("Total stations with data:", stations?.length);
    
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      toast({
        title: "Copiado para a área de transferência!",
        description: "O texto do pedido foi copiado com sucesso.",
      });
      
      // Reset copy icon after 3 seconds
      setTimeout(() => setHasCopied(false), 3000);
    } catch (err) {
      console.error("Clipboard error:", err);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar para a área de transferência.",
        variant: "destructive",
      });
    }
  };

  // Format text for the order - direct implementation to ensure it works
  const formatOrderText = () => {
    if (!stations || !stations.length || Object.keys(selectedTanks).length === 0) {
      return "";
    }
    
    const currentDate = new Date().toLocaleDateString('pt-BR');
    let text = `*PEDIDO DE COMBUSTÍVEL - ${currentDate}*\n\n`;
    
    // Track processed stations for logs
    const processedStations: Record<string, any[]> = {};
    const tanksProcessed: string[] = [];
    
    // Group by station for the formatted output
    const stationGroups: Record<string, {
      name: string;
      tanks: Array<{
        code: string;
        type: string;
        quantity: number;
        priority: string;
      }>;
    }> = {};
    
    // Process all selections
    Object.entries(selectedTanks).forEach(([key, value]) => {
      if (!value.selected || value.quantity <= 0) {
        return;
      }
      
      // Extract the actual station ID and tank ID from the key format 'station-{stationId}-tank-{tankId}'
      // Parse the key which follows format: 'station-776-tank-296042380'
      const stationMatch = key.match(/station-(\d+)/); 
      const tankMatch = key.match(/tank-(\d+)/);
      
      if (!stationMatch || !tankMatch) {
        console.log(`Invalid key format: ${key}`);
        return;
      }
      
      // The actual stationId to search with - prepend with 'station-' since that's how IDs are stored
      const stationId = stationMatch[1]; // Raw ID number
      const fullStationId = `station-${stationId}`; // ID with prefix as stored in data
      const tankId = tankMatch[1];
      
      tanksProcessed.push(key);
      console.log(`Processing station ID: ${stationId}, full ID: ${fullStationId}, tank ID: ${tankId}`);
      
      const station = stations?.find(s => s.id === fullStationId);
      if (!station) {
        console.log(`Station not found: ${fullStationId} in stations:`, stations.map(s => s.id));
        return;
      }
      
      // Log available tanks in this station to help debug
      console.log(`Available tanks in station ${fullStationId}:`, station.tanks.map(t => ({ id: t.id, code: t.code })));
      
      // Check if tanks have 'tank-' prefix in their IDs
      const fullTankId = `tank-${tankId}`;
      
      // Try to find the tank using different possible formats
      const tank = station.tanks.find(t => {
        // Try matching with the full format first (likely format based on logs)
        if (t.id === fullTankId) {
          console.log(`Found tank by full ID: ${fullTankId}`);
          return true;
        }
        
        // Try matching with just the numeric ID
        if (t.id === tankId) {
          console.log(`Found tank by numeric ID: ${tankId}`);
          return true;
        }
        
        // Try string comparison
        if (String(t.id) === String(tankId) || String(t.id) === String(fullTankId)) {
          console.log(`Found tank by string comparison`);
          return true;
        }
        
        return false;
      });
      
      if (!tank) {
        console.log(`Tank not found: ${tankId} in station ${stationId}`);
        return;
      }

      // Initialize station group if not exists
      if (!stationGroups[station.name]) {
        stationGroups[station.name] = {
          name: station.name,
          tanks: []
        };
      }
      
      // Initialize processed stations tracking
      if (!processedStations[station.name]) {
        processedStations[station.name] = [];
      }
      
      // Calculate priority icon
      const percentage = tank.current / tank.capacity * 100;
      let priorityIcon = "🟢"; // default - operational
      
      if (percentage < 15) {
        priorityIcon = "🔴"; // critical
      } else if (percentage < 30) {
        priorityIcon = "🟠"; // warning
      }
      
      // Add to processed stations for debugging
      processedStations[station.name].push({
        tankId,
        quantity: value.quantity
      });
      
      // Add tank to station group
      stationGroups[station.name].tanks.push({
        code: tank.code,
        type: tank.type,
        quantity: Math.floor(value.quantity),
        priority: priorityIcon
      });
    });
    
    console.log("Processed stations:", processedStations);
    console.log("Tanks processed:", tanksProcessed);
    console.log("Station groups:", stationGroups);
    
    // Track totals by fuel type
    const totalsByFuelType: Record<string, number> = {};
    
    // Build text for each station
    Object.values(stationGroups).forEach(station => {
      // Add station name as header
      text += `*${station.name}*\n`;
      
      // Add each tank
      station.tanks.forEach(tank => {
        text += `${tank.priority} ${tank.code} - ${tank.type}: *${tank.quantity.toLocaleString()}L*\n`;
        
        // Add to fuel type totals
        if (!totalsByFuelType[tank.type]) {
          totalsByFuelType[tank.type] = 0;
        }
        totalsByFuelType[tank.type] += tank.quantity;
      });
      
      // Calculate and add station total
      const stationTotal = station.tanks.reduce((sum, tank) => sum + tank.quantity, 0);
      text += `Total ${station.name}: *${stationTotal.toLocaleString()}L*\n\n`;
    });
    
    // Add total geral with breakdown by fuel type
    text += `*TOTAL GERAL: ${Math.floor(totalLiters).toLocaleString()}L*\n`;
    
    // Add breakdowns by fuel type
    Object.entries(totalsByFuelType).forEach(([fuelType, quantity]) => {
      text += `Total de ${fuelType}: *${Math.floor(quantity).toLocaleString()}L*\n`;
    });
    
    console.log("Final text:", text);
    return text;
  };

  // Generate the Sophia payload in the required format
  const generateSophiaPayload = () => {
    if (!stations || !selectedTanks || !Object.keys(selectedTanks).length) {
      return null;
    }

    // Group data by station and fuel type
    const stationGroups: Record<string, any> = {};
    const totalsByFuelType: Record<string, number> = {};

    // Process each selected tank
    Object.keys(selectedTanks).forEach(key => {
      if (!selectedTanks[key].selected || selectedTanks[key].quantity <= 0) {
        return;
      }
      
      // Parse the key to extract station ID and tank ID
      const stationMatch = key.match(/station-(\d+)/);
      const tankMatch = key.match(/tank-(\d+)/);
      
      if (!stationMatch || !tankMatch) {
        console.log(`Invalid key format: ${key}`);
        return;
      }
      
      const stationId = stationMatch[1];
      const fullStationId = `station-${stationId}`;
      const tankId = tankMatch[1];
      const fullTankId = `tank-${tankId}`;
      
      const station = stations?.find(s => s.id === fullStationId);
      if (!station) {
        console.log(`Station not found for Sophia payload: ${fullStationId}`);
        return;
      }
      
      // Try to find the tank with various ID formats
      const tank = station.tanks.find(t => 
        t.id === fullTankId ||
        t.id === tankId ||
        String(t.id) === String(tankId) ||
        String(t.id) === String(`tank-${tankId}`)
      );
      
      if (!tank) {
        console.log(`Tank not found for Sophia payload: ${tankId} in station ${fullStationId}`);
        return;
      }
      
      // Get tank data
      const tankType = tank.type;
      const tankQuantity = Math.floor(selectedTanks[key].quantity);
      
      // Add to station groups
      if (!stationGroups[station.name]) {
        stationGroups[station.name] = {
          combustiveis: {}
        };
      }
      
      // Add or update fuel type in station
      if (!stationGroups[station.name].combustiveis[tankType]) {
        stationGroups[station.name].combustiveis[tankType] = {
          quantidade: 0,
          unidade: "litros"
        };
      }
      stationGroups[station.name].combustiveis[tankType].quantidade += tankQuantity;
      
      // Track totals by fuel type
      if (!totalsByFuelType[tankType]) {
        totalsByFuelType[tankType] = 0;
      }
      totalsByFuelType[tankType] += tankQuantity;
    });

    // Format into the expected structure
    const postos = Object.entries(stationGroups).map(([nome, data]: [string, any]) => ({
      nome,
      combustiveis: data.combustiveis
    }));

    return {
      eventType: "sophia_ai_order_manual", // Indicate this is a manual order
      timestamp: new Date().toISOString(),
      postos,
      resumo: totalsByFuelType
    };
  };

  // Send to Sophia with the proper payload format
  const handleSendToSophia = async () => {
    setIsSendingToSophia(true);
    
    try {
      // Generate the payload with the structure specified
      const payload = generateSophiaPayload();
      
      if (!payload) {
        throw new Error("Não foi possível gerar o payload para Sophia");
      }
      
      console.log("Sending payload to Sophia:", payload);
      
      // Get Sophia webhooks
      const sophiaWebhooks = await webhookApi.getWebhooksByType('sophia_ai_order');
      
      if (sophiaWebhooks.length === 0) {
        throw new Error("Nenhum webhook da Sophia configurado");
      }
      
      // Send to all configured Sophia webhooks
      const promises = sophiaWebhooks.map(webhook => 
        webhookApi.sendToWebhook(webhook.id, payload)
      );
      
      await Promise.all(promises);
      
      toast({
        title: "Enviado para Sophia!",
        description: "O pedido foi enviado com sucesso para a IA Sophia.",
      });
      
      // Close modal and process order
      setOpen(false);
      onProcessOrder();
    } catch (err) {
      toast({
        title: "Erro ao enviar",
        description: err instanceof Error ? err.message : "Ocorreu um erro ao enviar para a Sophia.",
        variant: "destructive",
      });
    } finally {
      setIsSendingToSophia(false);
    }
  };
  
  // Process order without sending to Sophia
  const handleProcessOrder = () => {
    setOpen(false);
    onProcessOrder();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] w-11/12 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Processar Pedido</DialogTitle>
          <DialogDescription>
            {selectedCount} tanques selecionados - Total: {Math.floor(totalLiters).toLocaleString()}L
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-4 font-mono text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto overflow-x-hidden break-words">
            {formatOrderText()}
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={handleCopyToClipboard} className="flex items-center gap-1">
            {hasCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            <span>{hasCopied ? 'Copiado!' : 'Copiar'}</span>
          </Button>
            
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="default" onClick={handleProcessOrder}>
            <Truck className="mr-2 h-4 w-4" />
            Processar Pedido
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleSendToSophia}
            disabled={isSendingToSophia}
            className="w-full sm:w-auto sm:flex-none mt-2 sm:mt-0"
          >
            {isSendingToSophia ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div>
                Enviando...
              </div>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Enviar para Sophia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
