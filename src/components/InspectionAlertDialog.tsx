import { useState, useEffect } from "react";
import { AlertTriangle, AlertCircle, Brain, SendIcon } from "lucide-react";
import webhookApi, { Webhook, InternalContact } from "@/services/webhook-api";
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

interface InspectionAlertDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  tanks: any[]; // Lista de tanques com pendências de inspeção
}

export default function InspectionAlertDialog({ 
  open, 
  setOpen, 
  tanks 
}: InspectionAlertDialogProps): JSX.Element {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [internalContacts, setInternalContacts] = useState<InternalContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Carregar webhooks de alertas de inspeção
  useEffect(() => {
    const fetchWebhooks = async () => {
      if (open) {
        setIsLoading(true);
        try {
          // Buscar webhooks do tipo 'inspection_alert'
          const inspectionWebhooks = await webhookApi.getWebhooksByType('inspection_alert');
          setWebhooks(inspectionWebhooks);

          // Carregar contatos internos para mapear IDs a telefones
          const contacts = await webhookApi.getInternalContacts();
          setInternalContacts(contacts);
        } catch (error) {
          console.error("Erro ao buscar webhooks de inspeção:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os webhooks de alerta de inspeção.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchWebhooks();
  }, [open]);

  // Função para enviar alertas de inspeção para todos os webhooks cadastrados
  const handleSendAlerts = async () => {
    if (webhooks.length === 0) {
      toast({
        title: "Sem webhooks",
        description: "Não há webhooks de alerta de inspeção cadastrados.",
        variant: "destructive",
      });
      return;
    }
    
    if (tanks.length === 0) {
      toast({
        title: "Sem dados",
        description: "Não há tanques com pendências de inspeção para enviar.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      // Preparar dados dos tanques no formato padronizado
      const tanquesProcessados = tanks.map(tank => {
        // Extrair o nome do cliente e da unidade do posto
        const postoCompleto = tank.station_name || tank.stationName || '';
        const postoPartes = postoCompleto.split(' - ');
        const cliente = postoPartes[0] || 'Cliente';
        const unidade = postoPartes[1] || 'Posto';
        
        // Extrair o número do tanque do código
        const tanqueNumero = (tank.code || '').replace(/\D/g, '') || '0';
        
        // Formatar a quantidade de água
        const aguaFormatada = `${tank.waterAmount.toFixed(1)}L`;
        
        return {
          // Dados para uso interno
          id: tank.id,
          codigo: tank.code,
          posto: postoCompleto,
          tipo: tank.product || tank.type,
          ultimaInspecao: tank.last_inspection || tank.lastInspection,
          diasSemInspecao: tank.days_since_inspection || tank.daysSinceInspection,
          alertaAgua: true,
          nivelAgua: tank.waterAmount,
          capacidade: tank.capacity,
          nivelAtual: tank.current,
          
          // Dados formatados para o padrão de alerta
          cliente,
          unidade,
          tanque: parseInt(tanqueNumero),
          produto: tank.product || tank.type || '',
          quantidade_agua: aguaFormatada,
          data_medicao: new Date().toLocaleDateString('pt-BR')
        };
      });
      
      // Extrair nomes das unidades para incluir na mensagem
      const unidadesUnicas = [...new Set(tanquesProcessados.map(t => t.unidade))].filter(Boolean);
      const unidadesTexto = unidadesUnicas.length <= 2 
        ? unidadesUnicas.join(' e ') 
        : `${unidadesUnicas.slice(0, -1).join(', ')} e ${unidadesUnicas[unidadesUnicas.length-1]}`;
      
      // Base do payload para alertas
      const basePayload = {
        mensagem: `ALERTA FUELOGIC: Necessário inspeção em ${tanks.length} tanque(s) na unidade ${unidadesTexto}. Detalhes a seguir:`,
        alertas: tanquesProcessados,
        
        // Metadados adicionais
        eventType: 'inspection_alert',
        timestamp: new Date().toISOString(),
        quantidade: tanks.length,
        origem: 'fuelogic-enterprise'
      };
      
      // Enviar para cada webhook cadastrado
      let successCount = 0;
      let errorCount = 0;
      
      for (const webhook of webhooks) {
        try {
          // Determinar o número de telefone baseado no webhook
          let numero: string | undefined;

          if (webhook.integration === 'slingflow' && webhook.selected_contacts) {
            // selected_contacts pode vir em diferentes formatos
            if (Array.isArray(webhook.selected_contacts) && webhook.selected_contacts.length > 0) {
              const first = webhook.selected_contacts[0];
              // Caso antigo: array de objetos com telefone
              if (typeof first === 'object' && first?.telefone) {
                numero = String(first.telefone).replace(/\D/g, '');
              } else {
                // Novo formato: array de IDs
                const contactId = Number(first);
                const match = internalContacts.find(c => c.id === contactId);
                if (match?.telefone) {
                  numero = match.telefone.replace(/\D/g, '');
                }
              }
            } else if (typeof webhook.selected_contacts === 'object') {
              // Formato objeto { id: true }
              const ids = Object.keys(webhook.selected_contacts);
              if (ids.length > 0) {
                const contactId = Number(ids[0]);
                const match = internalContacts.find(c => c.id === contactId);
                if (match?.telefone) {
                  numero = match.telefone.replace(/\D/g, '');
                }
              }
            }
          }

          if (webhook.integration === 'slingflow' && !numero) {
            throw new Error('Telefone do contato não encontrado para o webhook SlingFlow');
          }

          // Montar o payload considerando se precisa de número ou não
          const webhookPayload = webhook.integration === 'slingflow'
            ? { ...basePayload, numero }
            : basePayload;
          
          // Usar a nova função sendInspectionAlert em vez de testWebhook
          await webhookApi.sendInspectionAlert(webhook.id!, webhookPayload);
          successCount++;
        } catch (error) {
          console.error(`Erro ao enviar para webhook ${webhook.name}:`, error);
          errorCount++;
        }
      }
      
      // Exibir mensagem de conclusão
      if (successCount > 0) {
        toast({
          title: "Alertas enviados",
          description: `Alertas de inspeção enviados com sucesso para ${successCount} webhooks.${
            errorCount > 0 ? ` Falha em ${errorCount} webhooks.` : ''
          }`,
        });
        
        // Fechar o dialog se houver pelo menos um sucesso
        setOpen(false);
      } else {
        toast({
          title: "Falha no envio",
          description: "Não foi possível enviar os alertas para nenhum dos webhooks cadastrados.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("Erro ao enviar alertas de inspeção:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar os alertas de inspeção.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
            Enviar Alertas de Inspeção
          </DialogTitle>
          <DialogDescription>
            Envie alertas de inspeção para todos os webhooks cadastrados para os {tanks.length} tanques que estão com pendências de água.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-sm text-gray-500">Carregando webhooks...</p>
            </div>
          ) : webhooks.length > 0 ? (
            <>
              <h3 className="font-medium mb-2">Webhooks que receberão os alertas:</h3>
              <div className="border rounded-md divide-y">
                {webhooks.map(webhook => (
                  <div key={webhook.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{webhook.name}</p>
                      <p className="text-sm text-gray-500">Tipo: {webhook.integration === 'slingflow' ? 'SlingFlow' : 
                        webhook.integration === 'sophia_ai' ? 'IA Sophia' : 'Genérico'}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Ativo
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-amber-800 font-medium">Os seguintes dados serão enviados:</p>
                    <ul className="text-sm text-amber-700 list-disc pl-5 mt-1">
                      <li>ID e código de cada tanque</li>
                      <li>Nome do posto</li>
                      <li>Tipo de combustível</li>
                      <li>Data da última inspeção</li>
                      <li>Dias desde a última inspeção</li>
                      <li>Indicador de alerta de água</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-700">Nenhum webhook encontrado</p>
              <p className="text-sm text-gray-500 mt-1">
                Não há webhooks do tipo 'inspection_alert' cadastrados no sistema.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="mt-4"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
        
        {webhooks.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSendAlerts} 
              disabled={isSending || webhooks.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              title="Enviar alertas de inspeção"
            >
              {isSending ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <SendIcon className="w-4 h-4 mr-2" />
                  Enviar Alertas
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
