import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import TruckManager from "@/components/trucks/TruckManager";
import { useNavigate } from "react-router-dom";
import { 
  Settings, 
  TruckIcon, 
  Building2, 
  Clock, 
  ShieldAlert, 
  Webhook, 
  Cpu, 
  PackageOpen,
  BarChart4,
  ArrowLeft,
  Users
} from "lucide-react";

import ThresholdConfiguration from "@/components/configuration/ThresholdConfiguration";

import PeopleManager from "@/components/people/PeopleManager";
import WebhookManager from "@/components/webhooks/WebhookManager";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("order-rules");
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      <Header />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Settings className="w-6 h-6 mr-2 text-emerald-500" />
          <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Painel de Configurações</CardTitle>
          <CardDescription>
            Gerencie todas as configurações do sistema em um único lugar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="order-rules" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-6 mb-8">
              <TabsTrigger value="order-rules" className="flex items-center">
                <PackageOpen className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Regras de Pedido</span>
                <span className="sm:hidden">Pedidos</span>
              </TabsTrigger>
              <TabsTrigger value="stations" className="flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Unidades e Postos</span>
                <span className="sm:hidden">Postos</span>
              </TabsTrigger>
              <TabsTrigger value="logistics" className="flex items-center">
                <TruckIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Caminhões e Logística</span>
                <span className="sm:hidden">Logística</span>
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="flex items-center">
                <Webhook className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Webhooks</span>
                <span className="sm:hidden">Webhooks</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center">
                <Cpu className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Integrações APIs</span>
                <span className="sm:hidden">APIs</span>
              </TabsTrigger>
              <TabsTrigger value="people" className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Pessoas</span>
                <span className="sm:hidden">Pessoas</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Conteúdo da aba Regras de Pedido */}
            <TabsContent value="order-rules" className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Regras de Pedido</h2>
              
              {/* Componente de configuração de thresholds */}
              <ThresholdConfiguration />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <BarChart4 className="w-5 h-5 mr-2 text-emerald-500" />
                    Prioridades por produto
                  </CardTitle>
                  <CardDescription>
                    Configure a prioridade de abastecimento para cada tipo de combustível
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400">
                    Funcionalidade em desenvolvimento. Aqui você poderá definir a ordem de prioridade 
                    para abastecimento de diferentes tipos de combustível.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-2 text-emerald-500" />
                    Margem de segurança
                  </CardTitle>
                  <CardDescription>
                    Defina os níveis mínimos de segurança para cada tipo de combustível
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400">
                    Funcionalidade em desenvolvimento. Aqui você poderá configurar os níveis mínimos 
                    de segurança para cada tipo de combustível.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-emerald-500" />
                    Horários de pedido
                  </CardTitle>
                  <CardDescription>
                    Configure os horários preferenciais para realização de pedidos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400">
                    Funcionalidade em desenvolvimento. Aqui você poderá definir os horários 
                    preferenciais para realização de pedidos de abastecimento.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Conteúdo da aba Unidades e Postos */}
            <TabsContent value="stations">
              <h2 className="text-xl font-semibold mb-4">Unidades e Postos</h2>
              <p className="text-slate-400">
                Funcionalidade em desenvolvimento. Aqui você poderá gerenciar as configurações 
                relacionadas às unidades e postos de combustível.
              </p>
            </TabsContent>
            
            {/* Conteúdo da aba Caminhões e Logística */}
            <TabsContent value="logistics" className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Caminhões e Logística</h2>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <TruckIcon className="w-5 h-5 mr-2 text-emerald-500" />
                    Gerenciamento de Frota
                  </CardTitle>
                  <CardDescription>
                    Cadastre e gerencie os caminhões da sua frota
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TruckManager />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Conteúdo da aba Webhooks */}
            <TabsContent value="webhooks" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Webhook className="w-5 h-5 mr-2 text-blue-500" />
                    Webhooks e Notificações
                  </CardTitle>
                  <CardDescription>
                    Configure integrações para notificações de alertas de inspeção e realização de pedidos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WebhookManager />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Conteúdo da aba Integrações APIs */}
            <TabsContent value="integrations">
              <h2 className="text-xl font-semibold mb-4">Integrações APIs</h2>
              <p className="text-slate-400">
                Funcionalidade em desenvolvimento. Aqui você poderá gerenciar as integrações 
                com APIs externas.
              </p>
            </TabsContent>

            {/* Conteúdo da aba Pessoas */}
            <TabsContent value="people" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="w-5 h-5 mr-2 text-emerald-500" />
                    Gerenciamento de Contatos
                  </CardTitle>
                  <CardDescription>
                    Cadastre e gerencie distribuidoras, fornecedores, gerentes e outros contatos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PeopleManager />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
