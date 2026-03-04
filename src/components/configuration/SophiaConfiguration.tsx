import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ConfigurationAPI, {
  DEFAULT_SOPHIA_CONFIG,
  SophiaConfigurationSettings,
  SophiaProvider,
} from "@/services/configuration-api";
import { BrainCircuit, KeyRound, Save } from "lucide-react";

const SophiaConfiguration = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<SophiaConfigurationSettings>(DEFAULT_SOPHIA_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await ConfigurationAPI.getSophiaConfig();
        setConfig(data);
      } catch {
        // already handled in API fallback
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const updateProvider = (provider: SophiaProvider) => {
    setConfig((prev) => ({ ...prev, provider }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await ConfigurationAPI.updateSophiaConfig(config);
      setConfig(saved);
      toast({
        title: "Configuração da Sophia salva",
        description: "Provider, modelo e chaves atualizados com sucesso.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar configurações da Sophia";
      toast({
        title: "Erro ao salvar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-emerald-500" />
          Sophia AI
        </CardTitle>
        <CardDescription>
          Configure provider, modelo e credenciais para a Sophia (OpenAI, OpenRouter e Anthropic).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Provider</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              type="button"
              variant={config.provider === "openai" ? "default" : "outline"}
              onClick={() => updateProvider("openai")}
            >
              OpenAI
            </Button>
            <Button
              type="button"
              variant={config.provider === "openrouter" ? "default" : "outline"}
              onClick={() => updateProvider("openrouter")}
            >
              OpenRouter
            </Button>
            <Button
              type="button"
              variant={config.provider === "anthropic" ? "default" : "outline"}
              onClick={() => updateProvider("anthropic")}
            >
              Anthropic
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sophia-model">Modelo</Label>
          <Input
            id="sophia-model"
            placeholder={
              config.provider === "openai"
                ? "gpt-4.1-mini"
                : config.provider === "openrouter"
                  ? "openai/gpt-4.1-mini"
                  : "claude-3-5-sonnet-latest"
            }
            value={config.model}
            onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="openai-key" className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            OpenAI API Key
          </Label>
          <Input
            id="openai-key"
            type="password"
            placeholder="sk-..."
            value={config.openai_api_key || ""}
            onChange={(e) => setConfig((prev) => ({ ...prev, openai_api_key: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="openrouter-key" className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            OpenRouter API Key
          </Label>
          <Input
            id="openrouter-key"
            type="password"
            placeholder="sk-or-..."
            value={config.openrouter_api_key || ""}
            onChange={(e) => setConfig((prev) => ({ ...prev, openrouter_api_key: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="anthropic-key" className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Anthropic API Key
          </Label>
          <Input
            id="anthropic-key"
            type="password"
            placeholder="sk-ant-..."
            value={config.anthropic_api_key || ""}
            onChange={(e) => setConfig((prev) => ({ ...prev, anthropic_api_key: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving || isLoading} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Sophia AI"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SophiaConfiguration;

