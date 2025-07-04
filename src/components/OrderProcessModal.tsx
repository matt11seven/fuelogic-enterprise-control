import React, { useState } from "react";
import { CopyIcon, Brain, CheckIcon, Truck, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Station } from "@/hooks/use-tank-data";
import webhookApi from "@/services/webhook-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [confirmSophiaOpen, setConfirmSophiaOpen] = useState(false);
  const { toast } = useToast();

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

  // Open confirmation dialog before sending to Sophia
  const handleOpenSophiaConfirmation = () => {
    setConfirmSophiaOpen(true);
  };
  
  // Send the text to Sophia webhooks
  const handleSendToSophia = async () => {
    try {
      setIsSendingToSophia(true);
      setConfirmSophiaOpen(false); // Close confirmation dialog
      
      // Generate the payload for Sophia
      const payload = generateSophiaPayload();
      console.log("Sophia payload:", payload);
      
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
    <>
      {/* Main order process dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] w-11/12 overflow-y-auto max-h-[90vh] flex flex-col">
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

          {/* Order text actions - secondary prominence */}
          <div className="flex justify-start items-center mb-3 border-t pt-3 border-slate-200 dark:border-slate-700">
            <Button 
              variant="ghost" 
              onClick={handleCopyToClipboard} 
              className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 h-9 px-3"
              size="sm"
            >
              {hasCopied ? 
                <CheckIcon className="h-3.5 w-3.5 text-emerald-500" /> : 
                <CopyIcon className="h-3.5 w-3.5" />
              }
              <span className="text-sm">{hasCopied ? 'Copiado!' : 'Copiar texto'}</span>
            </Button>
          </div>
          
          {/* Action buttons container - improved layout for better flow */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 mb-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
            {/* Sophia integration - primary action with cleaner, more compact styling */}
            <div className="col-span-1 sm:col-span-2">
              <Button 
                variant="default" 
                onClick={handleOpenSophiaConfirmation}
                disabled={isSendingToSophia}
                className={`
                  w-full h-full py-2 px-2
                  bg-gradient-to-r from-emerald-600 to-emerald-500
                  hover:from-emerald-700 hover:to-emerald-600
                  text-white font-medium
                  shadow-md hover:shadow-lg
                  transition-all duration-200
                  rounded-md border border-emerald-500/30
                  flex flex-col items-center justify-center
                  min-h-[70px]
                  ${isSendingToSophia ? 'opacity-90' : ''}
                `}
              >
                {isSendingToSophia ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-b-transparent border-white mb-1"></div>
                    <span className="text-sm whitespace-normal text-center">Enviando para Sophia...</span>
                  </>  
                ) : (
                  <>
                    <Brain className="h-5 w-5 mb-1" />
                    <span className="text-sm font-semibold whitespace-normal text-center">Enviar para Sophia</span>
                    <span className="text-xs text-emerald-100 mt-0.5 whitespace-normal text-center">IA avançada de processamento</span>
                  </>
                )}
              </Button>
            </div>
            
            {/* Secondary actions with balanced prominence */}
            <div className="col-span-1 flex flex-col gap-2 justify-between">
              <Button 
                variant="default" 
                onClick={handleProcessOrder}
                className="flex items-center justify-center py-2 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Truck className="h-4 w-4 mr-1.5" />
                <span className="text-sm whitespace-normal">Processar Pedido</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="h-9 border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="text-sm">Cancelar</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation dialog for Sophia */}
      <AlertDialog open={confirmSophiaOpen} onOpenChange={setConfirmSophiaOpen}>
        <AlertDialogContent className="max-w-[450px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-emerald-500" />
              <span>Confirmação de envio para Sophia</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar um pedido de {Math.floor(totalLiters).toLocaleString()}L para a IA Sophia.
              <br /><br />
              Este pedido será processado automaticamente pela Sophia e os fornecedores serão notificados conforme as configurações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="mt-2 sm:mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSendToSophia}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2 flex items-center justify-center"
            >
              <Brain className="h-4 w-4" />
              Confirmar envio para Sophia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
