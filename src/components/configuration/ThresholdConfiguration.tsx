import { useState, useEffect } from "react";
import { 
  Card,
  CardContent,
  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useConfig } from "@/context/ConfigContext";
import ConfigurationAPI from "@/services/configuration-api";

const ThresholdConfiguration = () => {
  const { thresholds, isLoading, reload } = useConfig();
  const [settings, setSettings] = useState(() => ({
    threshold_critico: thresholds.threshold_critico,
    threshold_atencao: thresholds.threshold_atencao
  }));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Verificar se houve alterações
  const hasChanges = () => {
    return (
      settings.threshold_critico !== thresholds.threshold_critico ||
      settings.threshold_atencao !== thresholds.threshold_atencao
    );
  };

  // Resetar para as configurações originais
  const handleReset = () => {
    setSettings({
      threshold_critico: thresholds.threshold_critico,
      threshold_atencao: thresholds.threshold_atencao
    });
  };

  // Salvar as configurações
  const handleSave = async () => {
    // Validação: crítico deve ser menor que atenção
    if (settings.threshold_critico > settings.threshold_atencao) {
      toast({
        title: "Erro de validação",
        description: "O valor crítico deve ser menor que o valor de atenção",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSaving(true);
      await ConfigurationAPI.updateConfigurations(settings);
      // Recarrega as configurações do contexto global após salvar
      await reload();
      toast({
        title: "Sucesso",
        description: "Configurações de prioridade atualizadas com sucesso",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações de prioridade",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
          Configuração de Status de Prioridade
        </CardTitle>
        <CardDescription>
          Defina os percentuais de corte para status crítico e atenção
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                  <div>
                    <p className="font-medium">Status Crítico (Vermelho)</p>
                    <p className="text-sm text-slate-500">
                      Tanques abaixo deste percentual serão marcados como críticos
                    </p>
                  </div>
                </div>
                <span className="text-xl font-semibold text-red-500">
                  {settings.threshold_critico}%
                </span>
              </div>
              
              <Slider
                defaultValue={[settings.threshold_critico]}
                value={[settings.threshold_critico]}
                max={settings.threshold_atencao - 1}
                step={1}
                onValueChange={([value]) => {
                  setSettings({
                    ...settings,
                    threshold_critico: value
                  });
                }}
                className="w-full"
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-amber-500" />
                  <div>
                    <p className="font-medium">Status Atenção (Amarelo)</p>
                    <p className="text-sm text-slate-500">
                      Tanques abaixo deste percentual serão marcados como atenção
                    </p>
                  </div>
                </div>
                <span className="text-xl font-semibold text-amber-500">
                  {settings.threshold_atencao}%
                </span>
              </div>
              
              <Slider
                defaultValue={[settings.threshold_atencao]}
                value={[settings.threshold_atencao]}
                min={settings.threshold_critico + 1}
                max={90}
                step={1}
                onValueChange={([value]) => {
                  setSettings({
                    ...settings,
                    threshold_atencao: value
                  });
                }}
                className="w-full"
              />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <h3 className="text-sm font-semibold mb-2">Como funcionam os thresholds</h3>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                  <strong>Crítico (Vermelho):</strong> Abaixo de {settings.threshold_critico}%
                </p>
                <p>
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                  <strong>Atenção (Amarelo):</strong> Entre {settings.threshold_critico}% e {settings.threshold_atencao}%
                </p>
                <p>
                  <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>
                  <strong>Operacional (Verde):</strong> Acima de {settings.threshold_atencao}%
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!hasChanges() || isLoading || saving}
          className="flex items-center"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Restaurar
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!hasChanges() || isLoading || saving}
          className="flex items-center"
          size="sm"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Salvar
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ThresholdConfiguration;
