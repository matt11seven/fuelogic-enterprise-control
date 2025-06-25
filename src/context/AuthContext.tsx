import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import { dbService } from '@/services/db-service';

// Credenciais de emergência baseadas em variáveis de ambiente - IMPORTANTE: VITE_ prefix é necessário
const EMERGENCY_CREDENTIALS = {
  username: import.meta.env.VITE_MASTER_USERNAME || '',
  password: import.meta.env.VITE_MASTER_PASSWORD || '',
  apiKey: import.meta.env.VITE_API_KEY || ''
};

// Debug: apenas para desenvolvimento
console.log('Variáveis de ambiente disponíveis:', Object.keys(import.meta.env));
console.log('Credenciais de emergência configuradas:', Boolean(EMERGENCY_CREDENTIALS.username && EMERGENCY_CREDENTIALS.password));

// Verificar se as credenciais de emergência estão configuradas
const hasEmergencyLogin = Boolean(EMERGENCY_CREDENTIALS.username && EMERGENCY_CREDENTIALS.password);

interface User {
  id: string;
  username: string;
  email: string | null;
  role: string;
  apiKey: string | null;
}

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

  // Função para buscar a API key (sem chamada ao banco)
  const getApiKey = async (): Promise<string | null> => {
    // Verificar primeiro se existe no .env
    const envApiKey = import.meta.env.VITE_API_KEY;
    
    if (envApiKey) {
      return envApiKey;
    }
    
    // Se não encontrou no .env, verificar usuário logado
    if (user?.apiKey) {
      return user.apiKey;
    }
    
    // Se estiver em modo de emergência, usar a chave de emergência
    return EMERGENCY_CREDENTIALS.apiKey;
  };

  // Função de login (com suporte a modo emergência)
  const login = async (username: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      // Para modo emergência, verificar se as variáveis de ambiente estão configuradas
      if (hasEmergencyLogin && username === EMERGENCY_CREDENTIALS.username && password === EMERGENCY_CREDENTIALS.password) {
        const emergencyUser = {
          id: "emergency-user",
          username: EMERGENCY_CREDENTIALS.username,
          email: "admin@fuelogic.com",
          role: "admin",
          apiKey: EMERGENCY_CREDENTIALS.apiKey
        };
        
        // Armazenar o usuário nos dados da sessão
        setUser(emergencyUser);
        localStorage.setItem('fuelogic_user', JSON.stringify(emergencyUser));
        setApiKey(EMERGENCY_CREDENTIALS.apiKey);
        
        return true;
      }
      
      // Em uma implementação real, aqui faria a chamada a uma API de login
      // await api.post('/auth/login', { username, password })
      
      // Por enquanto, apenas rejeitar qualquer outro login
      setError('Credenciais inválidas ou servidor indisponível');
      return false;
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
    
    // Manter API key se vier do .env
    const envApiKey = import.meta.env.VITE_API_KEY;
    setApiKey(envApiKey || null);
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
