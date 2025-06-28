import { useState, useEffect } from "react";
import { Calculator, ShoppingCart, AlertCircle, AlertTriangle, CheckCircle, Truck, PlusCircle, CheckSquare } from "lucide-react";
import { useConfig } from "@/context/ConfigContext";
import { getAllTrucks } from "@/services/truck-api";
import { Truck as TruckType } from "@/types/truck";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Station } from "@/hooks/use-tank-data";
import { toast } from "@/hooks/use-toast";

// Interface para sugestão de compra para um tanque
interface TankPurchaseSuggestion {
  stationId: string;
  stationName: string;
  tankId: string;
  tankCode: string;
  tankType: string;
  currentLevel: number;
  capacity: number;
  fillAmount: number;
  priority: "critical" | "warning" | "normal";
}

// Interface para caminhão com seleção
interface TruckWithSelection extends TruckType {
  isSelected: boolean;
}

interface PurchaseSuggestionModalProps {
  stations: Station[] | undefined;
}

export default function PurchaseSuggestionModal({ stations }: PurchaseSuggestionModalProps): JSX.Element {
  // Obter os thresholds configurados do contexto global
  const { thresholds } = useConfig();
  const [open, setOpen] = useState(false);
  const [truckCapacity, setTruckCapacity] = useState<number>(0);
  const [priorityFilter, setPriorityFilter] = useState<string>("critical");
  const [suggestions, setSuggestions] = useState<TankPurchaseSuggestion[]>([]);
  const [calculatedOrders, setCalculatedOrders] = useState<any[]>([]);
  const [totalSuggestedLiters, setTotalSuggestedLiters] = useState<number>(0);
  
  // Estado para o modal de seleção de caminhões
  const [trucksDialogOpen, setTrucksDialogOpen] = useState(false);
  
  // Lista de caminhões da frota (obtida via API)
  const [trucks, setTrucks] = useState<TruckWithSelection[]>([]);
  // Estado de carregamento
  const [isLoadingTrucks, setIsLoadingTrucks] = useState(false);
  const [truckLoadError, setTruckLoadError] = useState<string | null>(null);

  // Calcular sugestões quando o modal é aberto
  useEffect(() => {
    if (open && stations) {
      generatePurchaseSuggestions();
    }
  }, [open, stations, priorityFilter, truckCapacity]);

  const generatePurchaseSuggestions = () => {
    if (!stations) return;

    // Coletar todos os tanques e calcular sugestões
    const allSuggestions: TankPurchaseSuggestion[] = [];

    // Converter os thresholds de porcentagem para decimal (0-1)
    const criticalThreshold = thresholds.threshold_critico / 100;
    const warningThreshold = thresholds.threshold_atencao / 100;

    stations.forEach(station => {
      station.tanks.forEach(tank => {
        const currentPercentage = tank.current / tank.capacity;
        const emptySpace = tank.capacity - tank.current;
        let priority: "critical" | "warning" | "normal" = "normal";

        // Determinar prioridade com base na porcentagem atual usando thresholds configurados
        if (currentPercentage < criticalThreshold) {
          priority = "critical";
        } else if (currentPercentage < warningThreshold) {
          priority = "warning";
        }

        // Adicionar apenas se houver espaço para encher
        if (emptySpace > 0) {
          allSuggestions.push({
            stationId: station.id,
            stationName: station.name,
            tankId: tank.id,
            tankCode: tank.code,
            tankType: tank.type,
            currentLevel: tank.current,
            capacity: tank.capacity,
            fillAmount: emptySpace,
            priority
          });
        }
      });
    });

    // Filtrar tanques com base na prioridade selecionada
    let filteredSuggestions = allSuggestions.filter(suggestion => {
      if (priorityFilter === "critical") {
        return suggestion.priority === "critical";
      } else if (priorityFilter === "critical_warning") {
        return suggestion.priority === "critical" || suggestion.priority === "warning";
      } else {
        // "all" - incluir todos, mas ordenados por prioridade
        return true;
      }
    });

    // Ordenar por prioridade (crítico primeiro, depois atenção, depois normal)
    filteredSuggestions.sort((a, b) => {
      const priorityOrder = { critical: 1, warning: 2, normal: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    setSuggestions(filteredSuggestions);
    calculateOrders(filteredSuggestions);
  };

  // Calcular os pedidos otimizados em lotes de 5000L com distribuição equitativa
  const calculateOrders = (suggestions: TankPurchaseSuggestion[]) => {
    if (!suggestions.length) {
      setCalculatedOrders([]);
      setTotalSuggestedLiters(0);
      return;
    }
    
    // Tratar capacidade 0 como ilimitada
    const isUnlimited = truckCapacity === 0;

    let remainingCapacity = isUnlimited ? Number.MAX_SAFE_INTEGER : truckCapacity;
    const orders: any[] = [];
    let totalLiters = 0;

    // Agrupar tanques por prioridade
    const criticalTanks = suggestions.filter(s => s.priority === "critical");
    const warningTanks = suggestions.filter(s => s.priority === "warning");
    const normalTanks = suggestions.filter(s => s.priority === "normal");
    
    // Processar cada grupo de prioridade
    const processPriorityGroup = (tanks: TankPurchaseSuggestion[]) => {
      if (tanks.length === 0 || remainingCapacity <= 0) return;
      
      // Calcular quantidade total disponível para este grupo de prioridade
      const totalTanksInGroup = tanks.length;
      const totalSpaceNeeded = tanks.reduce((sum, tank) => sum + tank.fillAmount, 0);
      
      // Se temos capacidade suficiente para todos, usar valores originais
      if (totalSpaceNeeded <= remainingCapacity) {
        // Ainda precisamos garantir múltiplos de 5000L por tanque
        for (const tank of tanks) {
          const fillAmount = Math.floor(tank.fillAmount / 5000) * 5000;
          if (fillAmount >= 5000) {
            orders.push({
              ...tank,
              suggestedFill: fillAmount
            });
            remainingCapacity -= fillAmount;
            totalLiters += fillAmount;
          }
        }
      } else {
        // Distribuir equitativamente entre tanques do mesmo nível de prioridade
        // Calcular quanto cada tanque deve receber
        const baseAmountPerTank = Math.floor((remainingCapacity / totalTanksInGroup) / 5000) * 5000;
        
        // Sempre garantir pelo menos 5000L por tanque, se possível
        if (baseAmountPerTank >= 5000) {
          for (const tank of tanks) {
            orders.push({
              ...tank,
              suggestedFill: baseAmountPerTank
            });
            remainingCapacity -= baseAmountPerTank;
            totalLiters += baseAmountPerTank;
          }
          
          // Se sobrou capacidade após a distribuição equitativa, distribua mais 5000L por tanque até esgotar
          let index = 0;
          while (remainingCapacity >= 5000 && index < tanks.length) {
            orders[orders.length - tanks.length + index].suggestedFill += 5000;
            remainingCapacity -= 5000;
            totalLiters += 5000;
            index++;
            
            // Se chegamos ao fim da lista, volte ao primeiro tanque
            if (index >= tanks.length && remainingCapacity >= 5000) {
              index = 0;
            }
          }
        } else {
          // Se não temos 5000L por tanque, atender alguns tanques com 5000L cada
          const tanksCanFill = Math.floor(remainingCapacity / 5000);
          for (let i = 0; i < tanksCanFill; i++) {
            orders.push({
              ...tanks[i],
              suggestedFill: 5000
            });
            remainingCapacity -= 5000;
            totalLiters += 5000;
          }
        }
      }
    };
    
    // Processar em ordem de prioridade
    processPriorityGroup(criticalTanks);
    if (remainingCapacity > 0) processPriorityGroup(warningTanks);
    if (remainingCapacity > 0) processPriorityGroup(normalTanks);
    
    setCalculatedOrders(orders);
    setTotalSuggestedLiters(totalLiters);
  };

  // Formatar texto do pedido para envio via WhatsApp
  const formatOrderText = () => {
    if (calculatedOrders.length === 0) return "";
    
    const currentDate = new Date().toLocaleDateString('pt-BR');
    let text = `*PEDIDO DE COMBUSTÍVEL - ${currentDate}*\n\n`;
    
    // Agrupar pedidos por posto
    const ordersByStation: Record<string, any[]> = {};
    calculatedOrders.forEach(order => {
      if (!ordersByStation[order.stationName]) {
        ordersByStation[order.stationName] = [];
      }
      ordersByStation[order.stationName].push(order);
    });
    
    // Criar texto formatado para cada posto
    Object.keys(ordersByStation).forEach(stationName => {
      text += `*${stationName}*\n`;
      
      ordersByStation[stationName].forEach(order => {
        const prioritySymbol = order.priority === "critical" ? "🔴" :
                              order.priority === "warning" ? "🟠" : "🟢";
        
        text += `${prioritySymbol} ${order.tankCode} - ${order.tankType}: *${order.suggestedFill.toLocaleString()}L*\n`;
      });
      
      // Calcular total do posto
      const stationTotal = ordersByStation[stationName].reduce(
        (sum, order) => sum + order.suggestedFill, 0
      );
      
      text += `Total ${stationName}: *${stationTotal.toLocaleString()}L*\n\n`;
    });
    
    text += `*TOTAL GERAL: ${totalSuggestedLiters.toLocaleString()}L*\n`;
    if (truckCapacity > 0) {
      const usedPercentage = (totalSuggestedLiters / truckCapacity * 100).toFixed(0);
      text += `Capacidade utilizada: ${usedPercentage}%\n`;
      if (totalSuggestedLiters < truckCapacity) {
        text += `Capacidade remanescente: ${(truckCapacity - totalSuggestedLiters).toLocaleString()}L\n`;
      }
    }
    
    return text;
  };
  
  // Carregar caminhões ao abrir o modal
  useEffect(() => {
    if (open) {
      loadTrucks();
    }
  }, [open]);
  
  // Função para carregar caminhões da API
  const loadTrucks = async () => {
    setIsLoadingTrucks(true);
    setTruckLoadError(null);
    try {
      const trucksData = await getAllTrucks();
      // Filtrar apenas caminhões ativos e adicionar propriedade isSelected
      const activeTrucks = trucksData
        .filter(truck => truck.status === 'active')
        .map(truck => ({
          ...truck,
          isSelected: false
        }));
      setTrucks(activeTrucks);
    } catch (error) {
      console.error('Erro ao carregar caminhões:', error);
      setTruckLoadError('Não foi possível carregar os caminhões. Tente novamente.');
      toast({
        title: "Erro ao carregar caminhões",
        description: "Ocorreu um erro ao buscar os dados dos caminhões.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTrucks(false);
    }
  };

  // Função para alternar a seleção de um caminhão
  const toggleTruckSelection = (truckId: number) => {
    setTrucks(trucks.map(truck => 
      truck.id === truckId ? { ...truck, isSelected: !truck.isSelected } : truck
    ));
  };
  
  // Função para selecionar todos os caminhões ativos
  const selectAllTrucks = () => {
    setTrucks(trucks.map(truck => ({ ...truck, isSelected: true })));
    toast({
      title: "Todos os caminhões selecionados",
      description: `${trucks.length} caminhões foram selecionados.`,
    });
  };
  
  // Função para calcular e aplicar a capacidade total dos caminhões selecionados
  const applySelectedTrucksCapacity = () => {
    const totalCapacity = trucks
      .filter(truck => truck.isSelected)
      .reduce((sum, truck) => sum + truck.capacity, 0);
      
    setTruckCapacity(totalCapacity);
    setTrucksDialogOpen(false);
    
    // Notificar o usuário
    if (totalCapacity > 0) {
      toast({
        title: "Capacidade Atualizada",
        description: `Capacidade disponível atualizada para ${totalCapacity.toLocaleString()} litros.`,
      });
    }
  };
  
  const handleProcessSuggestion = () => {
    const orderText = formatOrderText();
    
    // Copiar para o clipboard
    navigator.clipboard.writeText(orderText)
      .then(() => {
        toast({
          title: "Pedido Copiado",
          description: `${calculatedOrders.length} tanques selecionados. Texto formatado copiado para área de transferência.`,
        });
        setOpen(false);
      })
      .catch(err => {
        console.error('Erro ao copiar: ', err);
        toast({
          title: "Erro ao Copiar",
          description: "Não foi possível copiar o texto para a área de transferência.",
          variant: "destructive"
        });
      });
  };

  return (
    <>
      <Button 
        onClick={() => setOpen(true)} 
        variant="outline" 
        className="flex items-center bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/40"
      >
        <ShoppingCart className="w-4 h-4 mr-2" />
        Sugerir Compras
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center">
              <Calculator className="w-5 h-5 mr-2 text-emerald-500" />
              Sugestão de Compras
            </DialogTitle>
            <DialogDescription>
              Otimize sua compra baseada em prioridade e capacidade disponível.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Filtros de prioridade */}
            <div className="space-y-4">
              <Label className="text-base">Prioridade de Compra</Label>
              <RadioGroup 
                defaultValue="critical" 
                value={priorityFilter} 
                onValueChange={setPriorityFilter}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="critical" id="critical" />
                  <Label htmlFor="critical" className="flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                    Somente tanques críticos (&lt;{thresholds.threshold_critico}%)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="critical_warning" id="critical_warning" />
                  <Label htmlFor="critical_warning" className="flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                    Tanques críticos + atenção (&lt;{thresholds.threshold_atencao}%)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                    Completar todos os tanques (por prioridade)
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Campo para capacidade do caminhão */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-300">
                <span>Capacidade disponível:</span>
                <Input 
                  type="number" 
                  value={truckCapacity} 
                  onChange={(e) => setTruckCapacity(Number(e.target.value))} 
                  className="w-32 text-right" 
                  min="0" 
                  step="5000"
                  placeholder="0 = ilimitado"
                />
                <span>litros {truckCapacity === 0 && "(ilimitado)"}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTrucksDialogOpen(true)}
                  className="ml-2 flex items-center bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/40"
                >
                  <Truck className="w-4 h-4 mr-1" />
                  Selecionar Caminhões
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pedidos são calculados em múltiplos de 5.000 litros
              </p>
            </div>
            
            {/* Resumo da sugestão */}
            <div className="space-y-4">
              <h3 className="font-semibold">Resumo da Sugestão</h3>
              
              {calculatedOrders.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Nenhum pedido sugerido com os filtros atuais.
                </p>
              ) : (
                <>
                  <div className="overflow-auto max-h-[200px] border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Posto</th>
                          <th className="p-2 text-left">Tanque</th>
                          <th className="p-2 text-right">Atual</th>
                          <th className="p-2 text-right">Sugerido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculatedOrders.map((order, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/50' : ''}>
                            <td className="p-2 text-center">
                              {order.priority === "critical" ? (
                                <span title="Crítico" className="inline-flex items-center justify-center">
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                </span>
                              ) : order.priority === "warning" ? (
                                <span title="Atenção" className="inline-flex items-center justify-center">
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </span>
                              ) : (
                                <span title="Completar" className="inline-flex items-center justify-center">
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                </span>
                              )}
                            </td>
                            <td className="p-2">{order.stationName}</td>
                            <td className="p-2">{order.tankCode} - {order.tankType}</td>
                            <td className="p-2 text-right">{order.currentLevel.toLocaleString()}L</td>
                            <td className="p-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              +{order.suggestedFill.toLocaleString()}L
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="text-right font-bold">
                  {truckCapacity > 0 ? (
                    <>
                      Total: {totalSuggestedLiters.toLocaleString()}L de {truckCapacity.toLocaleString()}L disponíveis
                      <div className="text-slate-500 dark:text-slate-400 text-sm font-normal">
                        Utilizando {(totalSuggestedLiters / truckCapacity * 100).toFixed(0)}%
                        {totalSuggestedLiters < truckCapacity && (
                          <> • Sobra: {(truckCapacity - totalSuggestedLiters).toLocaleString()}L</>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      Total: {totalSuggestedLiters.toLocaleString()}L
                      <div className="text-slate-500 dark:text-slate-400 text-sm font-normal">
                        Capacidade ilimitada
                      </div>
                    </>
                  )}
                </div>
              </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleProcessSuggestion} 
              disabled={calculatedOrders.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Aplicar Sugestão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para seleção de caminhões */}
      <Dialog open={trucksDialogOpen} onOpenChange={setTrucksDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center">
              <Truck className="w-5 h-5 mr-2 text-amber-500" />
              Selecionar Caminhões
            </DialogTitle>
            <DialogDescription>
              Selecione os caminhões disponíveis para calcular a capacidade total.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* Botão para selecionar todos os caminhões ativos */}
            {!isLoadingTrucks && !truckLoadError && trucks.length > 0 && (
              <div className="mb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllTrucks}
                  className="w-full bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/40"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Selecionar todos os caminhões
                </Button>
              </div>
            )}
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {isLoadingTrucks ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : truckLoadError ? (
                <div className="text-center py-8 text-red-500">
                  <AlertCircle className="mx-auto h-10 w-10 mb-2" />
                  <p>{truckLoadError}</p>
                  <Button 
                    onClick={loadTrucks} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : trucks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>Nenhum caminhão ativo encontrado.</p>
                </div>
              ) : (
                trucks.map(truck => (
                  <div 
                    key={truck.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${truck.isSelected ? 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    <div className="flex items-center w-full">
                      <input
                        type="checkbox"
                        checked={truck.isSelected}
                        onChange={() => toggleTruckSelection(truck.id)}
                        id={`truck-${truck.id}`}
                        className="w-4 h-4 rounded border-slate-400 dark:border-slate-600 text-amber-500 focus:ring-amber-500"
                      />
                      <label htmlFor={`truck-${truck.id}`} className="ml-3 cursor-pointer flex-1">
                        <div className="font-medium">{truck.name}</div>
                        <div className="flex justify-between">
                          <div className="text-sm text-slate-500 dark:text-slate-400">Capacidade: {truck.capacity.toLocaleString()} litros</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">Placa: {truck.license_plate}</div>
                        </div>
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Resumo da capacidade total */}
            <div className="mt-4 bg-slate-50/80 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
              <div className="flex justify-between items-center">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Capacidade total:</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {trucks.filter(t => t.isSelected).reduce((sum, t) => sum + t.capacity, 0).toLocaleString()} litros
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setTrucksDialogOpen(false)}
              className="mr-2"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={applySelectedTrucksCapacity}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Aplicar Seleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
