import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import webhookApi, { Webhook, InternalContact } from "@/services/webhook-api";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WebhookFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (webhook: Webhook) => void;
  initialData?: Webhook;
  preselectedType?: 'inspection_alert' | 'order_placed' | 'sophia_ai_order';
}

const WebhookForm = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  preselectedType = 'inspection_alert'
}: WebhookFormProps) => {
  const [type, setType] = useState<string>(initialData?.type || 'inspection_alert');
  const [name, setName] = useState<string>(initialData?.name || '');
  const [url, setUrl] = useState(initialData?.url || '');
  const [integration, setIntegration] = useState<'generic' | 'slingflow' | 'sophia_ai'>(initialData?.integration || 'generic');
  const [selectedContacts, setSelectedContacts] = useState<any>(initialData?.selected_contacts || {});
  const [contacts, setContacts] = useState<InternalContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [contactsError, setContactsError] = useState('');

  // Resetar o formulário quando aberto ou dados iniciais alterados
  useEffect(() => {
    if (isOpen) {
      setType(initialData?.type || preselectedType);
      setName(initialData?.name || '');
      setUrl(initialData?.url || '');
      setIntegration(initialData?.integration || 'generic');
      setSelectedContacts(initialData?.selected_contacts || {});
      setUrlError('');
      setContactsError('');
      
      // Carregar contatos internos apenas quando o formulário for aberto
      loadContacts();
    }
  }, [isOpen, initialData, preselectedType]);

  // Carregar contatos internos
  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const data = await webhookApi.getInternalContacts();
      setContacts(data);
    } catch (error) {
      console.error('Erro ao carregar contatos internos:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const validateForm = () => {
    let isValid = true;

    // Validar URL para webhook genérico
    if (integration === 'generic') {
      if (!url.trim()) {
        setUrlError('A URL é obrigatória para webhooks genéricos');
        isValid = false;
      } else if (!isValidUrl(url)) {
        setUrlError('Digite uma URL válida');
        isValid = false;
      } else {
        setUrlError('');
      }
    }

    // Validar seleção de contatos para SlingFlow
    if (integration === 'slingflow' && Object.keys(selectedContacts || {}).length === 0) {
      setContactsError('Selecione pelo menos um contato para o SlingFlow');
      isValid = false;
    } else {
      setContactsError('');
    }

    return isValid;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const webhookData: Webhook = {
        id: initialData?.id,
        type,
        name,
        url,
        integration,
        selected_contacts: integration === 'slingflow' ? selectedContacts : undefined,
        is_active: true
      };
      
      onSave(webhookData);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para testar o webhook
  const handleTestWebhook = async () => {
    if (!initialData?.id) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Envia a requisição de teste e aguarda a resposta do backend
      const result = await webhookApi.testWebhook(initialData.id);
      
      // Backend retornou uma resposta - agora podemos mostrar o resultado
      setTestResult(result);
      console.log('Resultado do teste:', result);
      
      // Não mostramos alertas - os resultados serão exibidos na interface
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const toggleContact = (contactId: number) => {
    setSelectedContacts(prev => {
      const prevContacts = prev || {};
      const newContacts = {...prevContacts};
      
      if (newContacts[contactId]) {
        delete newContacts[contactId];
      } else {
        newContacts[contactId] = true;
      }
      
      return newContacts;
    });
    if (contactsError) setContactsError('');
  };

  const handleIntegrationChange = (value: 'generic' | 'slingflow' | 'sophia_ai') => {
    setIntegration(value);
    // Limpar erros relacionados ao tipo anterior
    if (value === 'generic') {
      setContactsError('');
    } else if (value === 'sophia_ai') {
      setContactsError('');
    } else {
      setUrlError('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="webhook-form-description">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Webhook' : 'Criar Novo Webhook'}
          </DialogTitle>
          <DialogDescription>
            Configure as opções do webhook abaixo. Após salvar, você pode testá-lo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">

          
          <div className="grid gap-2">
            <Label htmlFor="type">Tipo de Evento</Label>
            <Select
              value={type}
              onValueChange={(value: string) => setType(value)}
              disabled={isLoading}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inspection_alert">Alerta de Inspeção</SelectItem>
                <SelectItem value="order_placed">Realização de Pedido</SelectItem>
                <SelectItem value="sophia_ai_order">Pedidos IA Sophia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Webhook</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome descritivo do webhook"
              disabled={isLoading}
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Integração</Label>
            <RadioGroup 
              value={integration} 
              onValueChange={(value: 'generic' | 'slingflow' | 'sophia_ai') => handleIntegrationChange(value)}
              className="flex flex-col space-y-1"
              disabled={isLoading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="slingflow" id="slingflow" />
                <Label htmlFor="slingflow" className="font-normal">
                  SlingFlow (notificação para contatos internos)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="generic" id="generic" />
                <Label htmlFor="generic" className="font-normal">
                  Webhook Genérico (para integração com sistemas externos)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sophia_ai" id="sophia_ai" />
                <Label htmlFor="sophia_ai" className="font-normal">
                  IA Sophia (integração para cotação de pedidos)
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="url">URL do Webhook</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError('');
              }}
              placeholder="https://exemplo.com/webhook"
              disabled={isLoading}
              className={urlError ? "border-red-500" : ""}
            />
            {urlError && (
              <p className="text-sm text-red-500">{urlError}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Esta URL receberá notificações quando o evento ocorrer.
            </p>
          </div>
          
          {integration === 'slingflow' && (
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label>Selecione os Contatos Internos</Label>
                {isLoadingContacts && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
              
              {contactsError && (
                <p className="text-sm text-red-500">{contactsError}</p>
              )}
              
              <div className="border rounded-md">
                {contacts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    {isLoadingContacts ? 
                      "Carregando contatos..." : 
                      "Nenhum contato interno disponível. Cadastre contatos internos primeiro."}
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] rounded-md">
                    <div className="p-2">
                      {contacts.map((contact) => (
                        <div key={contact.id} className="flex items-start space-x-2 py-2">
                          <Checkbox 
                            id={`contact-${contact.id}`} 
                            checked={!!selectedContacts?.[contact.id]}
                            onCheckedChange={() => toggleContact(contact.id)}
                            disabled={isLoading}
                          />
                          <div className="grid gap-0.5">
                            <Label 
                              htmlFor={`contact-${contact.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {contact.nome}
                            </Label>
                            <p className="text-xs text-slate-500">
                              {contact.telefone} 
                              {contact.email ? ` • ${contact.email}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
              
              <p className="text-xs text-slate-500 mt-1">
                Os contatos selecionados receberão notificações via SlingFlow quando o evento ocorrer.
                <br />
                Apenas contatos classificados como internos são exibidos.
              </p>
            </div>
          )}
        </div>
        
        {/* Seção para mostrar o resultado do teste, se disponível */}
        {testResult && (
          <div 
            className={cn(
              "p-4 mt-4 mb-4 rounded-md flex items-start gap-2",
              testResult.success 
                ? "bg-green-50 border border-green-200 text-green-700" 
                : "bg-red-50 border border-red-200 text-red-700"
            )}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                {testResult.success ? "Teste concluído com sucesso" : "Falha no teste"}
              </p>
              <p className="text-sm">{testResult.message}</p>
              
              {/* Se houver dados detalhados e for bem-sucedido, mostrar mais informações */}
              {testResult.success && testResult.data && (
                <div className="mt-2 text-xs">
                  {testResult.data.webhook?.integration === 'generic' ? (
                    <p>URL: {testResult.data.webhook.url}</p>
                  ) : (
                    <p>Contatos: {Object.keys(testResult.data.webhook.selected_contacts || {}).length}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading || isTesting}>
            Cancelar
          </Button>
          
          {initialData?.id && (
            <Button 
              variant="outline" 
              onClick={handleTestWebhook} 
              disabled={isLoading || isTesting || !url}
              className="bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 border-orange-200"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                'Testar'
              )}
            </Button>
          )}
          
          <Button onClick={handleSubmit} disabled={isLoading || isTesting}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              initialData ? 'Salvar Alterações' : 'Criar Webhook'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WebhookForm;
