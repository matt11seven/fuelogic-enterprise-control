import axios from 'axios';

// Definindo a URL base da API de acordo com o ambiente
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Criando a instância do axios para a API de autenticação
const authApi = axios.create({
  baseURL: `${BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interface para o usuário
export interface User {
  id: string;
  username: string;
  email: string | null;
  role: string;
  apiKey: string | null;
}

// Interface para credenciais de login
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Realiza o login do usuário na API
 */
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const response = await authApi.post('/login', credentials);
    return response.data;
  } catch (error) {
    console.error('Erro ao realizar login:', error);
    throw error;
  }
};

/**
 * Obtém a API key do usuário master
 */
export const getMasterApiKey = async (): Promise<string | null> => {
  try {
    // Endpoint renomeado para evitar bloqueios por adblockers/extensões de privacidade
    const response = await authApi.get('/system-settings');
    return response.data.apiKey;
  } catch (error) {
    console.error('Erro ao obter API key do usuário master:', error);
    return null;
  }
};

/**
 * Registra um acesso no log
 */
export const logAccess = async (
  userId: string, 
  action: string, 
  token: string,
  ipAddress?: string, 
  userAgent?: string
): Promise<void> => {
  try {
    await authApi.post('/log-access', 
      { userId, action, ipAddress, userAgent },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (error) {
    console.error('Erro ao registrar acesso:', error);
  }
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  token: string
): Promise<void> => {
  try {
    await authApi.post(
      '/change-password',
      { currentPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error);
    throw error;
  }
};

export default {
  login,
  getMasterApiKey,
  logAccess,
  changePassword
};
