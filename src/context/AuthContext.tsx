import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authApi, { User, LoginCredentials } from '../services/auth-api';
import logger from '../utils/logger';

// Credenciais de emergência baseadas em variáveis de ambiente - IMPORTANTE: VITE_ prefix é necessário
const EMERGENCY_CREDENTIALS = {
  username: import.meta.env.VITE_MASTER_USERNAME || '',
  password: import.meta.env.VITE_MASTER_PASSWORD || '',
  apiKey: import.meta.env.VITE_API_KEY || ''
};

// Debug: apenas para desenvolvimento (usando o logger que controla pelo ambiente)
logger.log('Variáveis de ambiente disponíveis:', Object.keys(import.meta.env));
logger.log('Credenciais de emergência configuradas:', Boolean(EMERGENCY_CREDENTIALS.username && EMERGENCY_CREDENTIALS.password));
logger.log('API Key de emergência configurada:', Boolean(EMERGENCY_CREDENTIALS.apiKey));

// Verificar se as credenciais de emergência estão configuradas
const hasEmergencyLogin = Boolean(EMERGENCY_CREDENTIALS.username && EMERGENCY_CREDENTIALS.password);

interface AuthContextType {
  user: User | null;
  apiKey: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  getApiKey: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar a API key (com chamada à API)
  const getApiKey = async (): Promise<string | null> => {
    // IMPORTANTE: Sempre priorizar a apiKey do usuário logado (do banco de dados)
    if (user?.apiKey) {
      console.log('[INFO] Usando apiKey do usuário logado');
      return user.apiKey;
    }
    
    try {
      // Tentar obter a API key do usuário master via API
      console.log('[INFO] Tentando obter apiKey via API do backend');
      const masterKey = await authApi.getMasterApiKey();
      if (masterKey) {
        return masterKey;
      }
    } catch (error) {
      console.error('[ERRO] Falha ao obter API key do master:', error);
    }
    
    // Apenas como último recurso, usar a variável de ambiente ou credencial de emergência
    const envApiKey = import.meta.env.VITE_API_KEY;
    if (envApiKey) {
      console.log('[AVISO] Usando apiKey da variável de ambiente (não recomendado)');
      return envApiKey;
    }
    
    console.log('[AVISO] Nenhuma apiKey válida encontrada');
    return null; // Não temos uma apiKey válida
  };

  // Verificar usuário no localStorage e apiKey no .env ao iniciar
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      try {
        // Verificar se existe usuário armazenado no localStorage
        const storedUser = localStorage.getItem('fuelogic_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // Buscar a API key (primeiro do .env, depois do banco se necessário)
        const key = await getApiKey();
        setApiKey(key);
      } catch (err) {
        setError('Erro ao inicializar autenticação');
        console.error('Erro de inicialização:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Função de login (com suporte a modo emergência)
  const login = async (username: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      // Para modo emergência, verificar se as variáveis de ambiente estão configuradas
      if (hasEmergencyLogin && username === EMERGENCY_CREDENTIALS.username && password === EMERGENCY_CREDENTIALS.password) {
        // ATENÇÃO: No modo de emergência, verificar se realmente temos uma apiKey válida
        if (!EMERGENCY_CREDENTIALS.apiKey) {
          setError('API Key de emergência não configurada');
          console.error('Login emergencial falhou: apiKey não configurada');
          return false;
        }
        
        const emergencyUser = {
          id: "emergency-user",
          username: EMERGENCY_CREDENTIALS.username,
          email: "admin@fuelogic.com",
          role: "admin",
          apiKey: EMERGENCY_CREDENTIALS.apiKey
        } as User;
        
        // Armazenar o usuário nos dados da sessão
        setUser(emergencyUser);
        localStorage.setItem('fuelogic_user', JSON.stringify(emergencyUser));
        setApiKey(EMERGENCY_CREDENTIALS.apiKey);
        
        console.log('[INFO] Login emergencial realizado com sucesso');
        console.log('[DEBUG] apiKey emergencial configurada:', !!EMERGENCY_CREDENTIALS.apiKey);
        return true;
      }
      
      try {
        // Tentativa de autenticação usando a API
        const credentials: LoginCredentials = { username, password };
        const userData = await authApi.login(credentials);
        
        // Verificar se recebemos uma apiKey válida do backend
        if (!userData.apiKey) {
          console.warn('[AVISO] Login bem-sucedido mas sem apiKey do usuário. Verifique se a coluna api_key está sendo retornada corretamente pelo backend.');
        } else {
          console.log('[INFO] apiKey obtida do usuário: ', !!userData.apiKey);
        }
        
        // Usuário autenticado com sucesso
        setUser(userData);
        localStorage.setItem('fuelogic_user', JSON.stringify(userData));
        
        // Usamos diretamente a apiKey do usuário, sem fallbacks
        setApiKey(userData.apiKey);
        
        console.log('[INFO] Login via API realizado com sucesso');
        return true;
      } catch (apiError: any) {
        // Verificar o tipo de erro
        if (apiError.response) {
          // Erro retornado pelo servidor
          console.error('Erro de API:', apiError.response.data);
          setError(apiError.response.data.message || 'Credenciais inválidas');
        } else if (apiError.request) {
          // Sem resposta do servidor
          console.error('Sem resposta do servidor:', apiError.request);
          setError('Servidor indisponível. Verifique sua conexão.');
        } else {
          // Erro na configuração da requisição
          console.error('Erro de configuração:', apiError.message);
          setError('Erro ao configurar a requisição de login.');
        }
        return false;
      }
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError('Erro ao conectar ao servidor');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Função de logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('fuelogic_user');
    
    // Limpar completamente a apiKey ao fazer logout
    // Não queremos manter qualquer credencial após o logout
    setApiKey(null);
    
    console.log('[INFO] Logout realizado, apiKey removida');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        apiKey,
        isLoading,
        error,
        login,
        logout,
        getApiKey
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}
