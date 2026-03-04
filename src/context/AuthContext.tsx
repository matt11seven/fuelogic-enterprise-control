import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authApi, { User, LoginCredentials } from '../services/auth-api';
import logger from '../utils/logger';

const EMERGENCY_CREDENTIALS = {
  username: import.meta.env.VITE_MASTER_USERNAME || '',
  password: import.meta.env.VITE_MASTER_PASSWORD || '',
  apiKey: import.meta.env.VITE_API_KEY || '',
};

const hasEmergencyLogin = Boolean(
  EMERGENCY_CREDENTIALS.username && EMERGENCY_CREDENTIALS.password,
);
const API_KEY_STORAGE_KEY = 'fuelogic_api_key';

logger.log('Variaveis de ambiente disponiveis:', Object.keys(import.meta.env));
logger.log(
  'Credenciais de emergencia configuradas:',
  Boolean(EMERGENCY_CREDENTIALS.username && EMERGENCY_CREDENTIALS.password),
);
logger.log('API Key de emergencia configurada:', Boolean(EMERGENCY_CREDENTIALS.apiKey));

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

  const getApiKey = async (): Promise<string | null> => {
    if (user?.apiKey) {
      console.log('[INFO] Usando apiKey do usuario logado');
      return user.apiKey;
    }

    try {
      const storedUser = localStorage.getItem('fuelogic_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser) as Partial<User>;
        if (userData.apiKey) {
          console.log('[INFO] Usando apiKey do usuario persistido');
          return userData.apiKey;
        }
      }
    } catch (err) {
      console.error('[ERRO] Falha ao ler usuario persistido:', err);
    }

    const cachedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (cachedKey) {
      console.log('[INFO] Usando apiKey em cache local');
      return cachedKey;
    }

    try {
      console.log('[INFO] Tentando obter apiKey via API do backend');
      const masterKey = await authApi.getMasterApiKey();
      if (masterKey) return masterKey;
    } catch (err) {
      console.error('[ERRO] Falha ao obter API key do master:', err);
    }

    const envApiKey = import.meta.env.VITE_API_KEY;
    if (envApiKey) {
      console.log('[AVISO] Usando apiKey da variavel de ambiente (nao recomendado)');
      return envApiKey;
    }

    console.log('[AVISO] Nenhuma apiKey valida encontrada');
    return null;
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      try {
        let restoredKey: string | null = null;
        const storedUser = localStorage.getItem('fuelogic_user');

        if (storedUser) {
          const userData = JSON.parse(storedUser) as User;
          setUser(userData);
          if (userData.apiKey) restoredKey = userData.apiKey;

          if (userData.token && !localStorage.getItem('token')) {
            localStorage.setItem('token', userData.token);
            console.log('[INFO] Token JWT restaurado do usuario armazenado');
          }
        }

        if (!restoredKey) {
          restoredKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        }

        const key = restoredKey || (await getApiKey());
        setApiKey(key);
        if (key) {
          localStorage.setItem(API_KEY_STORAGE_KEY, key);
        }
      } catch (err) {
        setError('Erro ao inicializar autenticacao');
        console.error('Erro de inicializacao:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      if (
        hasEmergencyLogin &&
        username === EMERGENCY_CREDENTIALS.username &&
        password === EMERGENCY_CREDENTIALS.password
      ) {
        if (!EMERGENCY_CREDENTIALS.apiKey) {
          setError('API Key de emergencia nao configurada');
          console.error('Login emergencial falhou: apiKey nao configurada');
          return false;
        }

        const emergencyUser = {
          id: 'emergency-user',
          username: EMERGENCY_CREDENTIALS.username,
          email: 'admin@fuelogic.com',
          role: 'admin',
          apiKey: EMERGENCY_CREDENTIALS.apiKey,
          token: localStorage.getItem('token') || '',
        } as User;

        setUser(emergencyUser);
        localStorage.setItem('fuelogic_user', JSON.stringify(emergencyUser));
        setApiKey(EMERGENCY_CREDENTIALS.apiKey);
        localStorage.setItem(API_KEY_STORAGE_KEY, EMERGENCY_CREDENTIALS.apiKey);

        console.log('[INFO] Login emergencial realizado com sucesso');
        return true;
      }

      try {
        const credentials: LoginCredentials = { username, password };
        const userData = await authApi.login(credentials);

        if (!userData.apiKey) {
          if (EMERGENCY_CREDENTIALS.apiKey) {
            console.warn('[AVISO] Usando apiKey de emergencia como fallback');
            userData.apiKey = EMERGENCY_CREDENTIALS.apiKey;
          } else {
            userData.apiKey = '';
          }
        }

        setUser(userData);
        localStorage.setItem('fuelogic_user', JSON.stringify(userData));

        if (userData.token) {
          localStorage.setItem('token', userData.token);
        }

        setApiKey(userData.apiKey);
        if (userData.apiKey) {
          localStorage.setItem(API_KEY_STORAGE_KEY, userData.apiKey);
        }

        console.log('[INFO] Login via API realizado com sucesso');
        return true;
      } catch (apiError: any) {
        if (apiError.response) {
          setError(apiError.response.data.message || 'Credenciais invalidas');
        } else if (apiError.request) {
          setError('Servidor indisponivel. Verifique sua conexao.');
        } else {
          setError('Erro ao configurar a requisicao de login.');
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fuelogic_user');
    localStorage.removeItem('token');
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey(null);
    console.log('[INFO] Logout realizado, token e apiKey removidos');
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
        getApiKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}
