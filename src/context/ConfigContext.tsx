import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/components/ui/use-toast';
import ConfigurationAPI, { ConfigurationSettings, DEFAULT_THRESHOLDS } from '@/services/configuration-api';
import { useAuth } from './AuthContext';

interface ConfigContextType {
  thresholds: ConfigurationSettings;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

interface ConfigProviderProps {
  children: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [thresholds, setThresholds] = useState<ConfigurationSettings>(DEFAULT_THRESHOLDS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Função para buscar as configurações do usuário
  const loadConfigurations = async () => {
    if (!user) {
      // Não há usuário logado, não precisamos carregar configurações
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const config = await ConfigurationAPI.getConfigurations();
      setThresholds(config);
      console.log('[INFO] Configurações carregadas com sucesso:', config);
    } catch (error) {
      console.error('[ERRO] Falha ao carregar configurações:', error);
      toast({
        title: "Erro nas configurações",
        description: "Não foi possível carregar as configurações de prioridade. Usando valores padrão.",
        variant: "destructive",
      });
      // Usar valores padrão em caso de erro
      setThresholds(DEFAULT_THRESHOLDS);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar configurações quando o usuário fizer login
  useEffect(() => {
    if (user) {
      loadConfigurations();
    }
  }, [user]);

  const reload = async () => {
    await loadConfigurations();
  };

  return (
    <ConfigContext.Provider value={{ thresholds, isLoading, reload }}>
      {children}
    </ConfigContext.Provider>
  );
}

// Hook personalizado para usar o contexto de configuração
export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === null) {
    throw new Error('useConfig deve ser usado dentro de um ConfigProvider');
  }
  return context;
}
