import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, ExternalLink, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import webhookApi, { Webhook } from "@/services/webhook-api";
import WebhookForm from "./WebhookForm";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WebhookManager = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'inspection_alert' | 'order_placed'>('inspection_alert');
  const { toast } = useToast();

  // Carregar webhooks
  const loadWebhooks = async () => {
    setIsLoading(true);
    try {
      const data = await webhookApi.getAllWebhooks();
      setWebhooks(data);
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error);
      toast({
        title: "Erro ao carregar webhooks",
        description: "Não foi possível carregar a lista de webhooks.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Efeito para carregar webhooks na montagem do componente
  useEffect(() => {
    loadWebhooks();
  }, []);

  // Função para abrir formulário de novo webhook
  const openNewWebhookForm = () => {
    setSelectedWebhook(undefined);
    setIsFormOpen(true);
  };

  // Função para editar webhook
  const handleEditWebhook = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setIsFormOpen(true);
  };

  // Função para remover webhook
  const handleDeleteWebhook = async (id: number) => {
    try {
      await webhookApi.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
      toast({
        title: "Webhook removido",
        description: "O webhook foi removido com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao remover webhook",
        description: "Não foi possível remover o webhook.",
        variant: "destructive"
      });
    }
  };

  // Função para salvar webhook (criar ou atualizar)
  const handleSaveWebhook = async (webhook: Webhook) => {
    try {
      if (webhook.id) {
        // Atualizar webhook existente
        const updated = await webhookApi.updateWebhook(webhook.id, webhook);
        setWebhooks(prev => prev.map(w => w.id === webhook.id ? updated : w));
        toast({
          title: "Webhook atualizado",
          description: `O webhook "${webhook.name}" foi atualizado com sucesso.`,
        });
      } else {
        // Criar novo webhook
        const created = await webhookApi.createWebhook(webhook);
        setWebhooks(prev => [...prev, created]);
        toast({
          title: "Webhook criado",
          description: `O webhook "${webhook.name}" foi criado com sucesso.`,
        });
      }
      setIsFormOpen(false);
      setSelectedWebhook(undefined);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar webhook",
        description: error.message || (webhook.id ? 
          "Não foi possível atualizar o webhook." : 
          "Não foi possível criar o webhook."),
        variant: "destructive"
      });
    }
  };

  // Renderização das tabs
  // Função auxiliar para renderizar a lista de webhooks
  const renderWebhookList = (
    eventType: 'inspection_alert' | 'order_placed',
    webhooks: Webhook[],
    isLoading: boolean,
    onEdit: (webhook: Webhook) => void,
    onDelete: (id: number) => void
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8 border rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span>Carregando webhooks...</span>
        </div>
      );
    }

    if (webhooks.length === 0) {
      return (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-slate-500 dark:text-slate-400">
            Nenhum webhook configurado para {eventType === 'inspection_alert' ? 'alerta de inspeção' : 'realização de pedido'}.
          </p>
          <p className="text-sm mt-2 text-slate-400 dark:text-slate-500">
            Clique em "Novo Webhook" para adicionar uma configuração.
          </p>
        </div>
      );
    }

    return (
      <div className="border rounded-lg divide-y">
        {webhooks.map((webhook) => (
          <div key={webhook.id} className="p-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={webhook.integration === 'slingflow' ? "default" : "outline"} 
                       className={webhook.integration === 'slingflow' ? "bg-purple-600" : ""}>
                  {webhook.integration === 'slingflow' ? "SlingFlow" : "Webhook Genérico"}
                </Badge>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Criado em {new Date(webhook.created_at || Date.now()).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex flex-col">
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  {webhook.integration === 'slingflow' ? (
                    <>SlingFlow ({Object.keys(webhook.selected_contacts || {}).length} contatos)</>
                  ) : (
                    <>
                      Webhook Genérico: <span className="truncate max-w-[180px]">{webhook.url}</span>
                      {webhook.url && (
                        <ExternalLink className="h-3 w-3 cursor-pointer" onClick={(e) => {
                          e.stopPropagation();
                          window.open(webhook.url, '_blank');
                        }} />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(webhook)}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="outline" size="sm" className="text-red-500" onClick={() => onDelete(webhook.id!)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Configuração de Webhooks</h2>
        <Button 
          onClick={() => {
            setSelectedWebhook(undefined);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Webhook
        </Button>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Configure webhooks para receber notificações de alertas de inspeção e realização de pedidos.
        Você pode optar por usar SlingFlow (para notificação de contatos internos) ou um webhook genérico para integração com outros sistemas.
      </p>

      <Tabs
        value={activeTab}
        onValueChange={(value: 'inspection_alert' | 'order_placed') => setActiveTab(value)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inspection_alert">Alertas de Inspeção</TabsTrigger>
          <TabsTrigger value="order_placed">Realização de Pedidos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="inspection_alert" className="mt-4">
          {renderWebhookList(
            'inspection_alert',
            webhooks.filter(w => w.type === 'inspection_alert'),
            isLoading,
            handleEditWebhook,
            handleDeleteWebhook
          )}
        </TabsContent>
        
        <TabsContent value="order_placed" className="mt-4">
          {renderWebhookList(
            'order_placed',
            webhooks.filter(w => w.type === 'order_placed'),
            isLoading,
            handleEditWebhook,
            handleDeleteWebhook
          )}
        </TabsContent>
      </Tabs>

      <WebhookForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveWebhook}
        initialData={selectedWebhook}
        preselectedType={activeTab}
      />
    </div>
  );
  
};

export default WebhookManager;
