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
 * Verifica se a resposta é um objeto JSON válido ou HTML
 * @param data Os dados da resposta
 * @returns true se for JSON válido, false se for HTML ou outro formato inválido
 */
const isValidJsonResponse = (data: any): boolean => {
  // Verifica se a resposta parece ser HTML (começa com <!DOCTYPE, <html, etc)
  if (typeof data === 'string' && 
      (data.trim().startsWith('<!DOCTYPE') ||
       data.trim().startsWith('<html') ||
       data.trim().includes('</html>'))) {
    console.error('[ERRO] Recebeu HTML ao invés de JSON na resposta da API');
    console.error('[ERRO] Trecho da resposta:', data.substring(0, 100));
    return false;
  }
  
  // Verifica se é um objeto válido
  if (!data || typeof data !== 'object') {
    console.error('[ERRO] Resposta da API não é um objeto válido:', typeof data);
    return false;
  }
  
  return true;
};

/**
 * Realiza o login do usuário na API
 */
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    console.log(`[INFO] Tentando fazer login no endpoint: ${authApi.defaults.baseURL}/login`);
    const response = await authApi.post('/login', credentials);
    
    // Verificar se a resposta é um objeto JSON válido
    if (!isValidJsonResponse(response.data)) {
      throw new Error(`Resposta inválida do servidor. Verifique se a URL da API está correta: ${authApi.defaults.baseURL}`);
    }
    
    return response.data;
  } catch (error: any) {
    // Log mais detalhado do erro
    console.error('Erro ao realizar login:', error);
    
    // Se recebeu uma resposta mas ela não é JSON (provavelmente HTML)
    if (error.response && typeof error.response.data === 'string' && 
        error.response.data.includes('<!DOCTYPE html>')) {
      console.error('[ERRO CRÍTICO] Servidor retornou HTML em vez de JSON. Verifique a configuração do proxy reverso.');
    }
    
    throw error;
  }
};

/**
 * Obtém a API key do usuário master
 */
export const getMasterApiKey = async (): Promise<string | null> => {
  try {
    console.log(`[INFO] Tentando obter API key do endpoint: ${authApi.defaults.baseURL}/system-settings`);
    // Endpoint renomeado para evitar bloqueios por adblockers/extensões de privacidade
    const response = await authApi.get('/system-settings');
    
    // Verificar se a resposta é um objeto JSON válido
    if (!isValidJsonResponse(response.data)) {
      console.error('[ERRO] Resposta inválida ao obter API key');  
      return null;
    }
    
    return response.data.apiKey;
  } catch (error: any) {
    console.error('Erro ao obter API key do usuário master:', error);
    
    // Log mais detalhado se recebeu HTML
    if (error.response && typeof error.response.data === 'string' && 
        error.response.data.includes('<!DOCTYPE html>')) {
      console.error('[ERRO] Servidor retornou HTML em vez de JSON ao buscar API key. Verifique a URL da API.');
    }
    
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

export default {
  login,
  getMasterApiKey,
  logAccess
};
