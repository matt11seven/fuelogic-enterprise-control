import axios from 'axios';

// Definindo a URL base da API de acordo com o ambiente - sem duplicar /api
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Removendo /api do BASE_URL se já estiver presente para evitar duplicação
const API_BASE_URL = BASE_URL.endsWith('/api') 
  ? `${BASE_URL}/webhooks`
  : `${BASE_URL}/api/webhooks`;

// Log para depuração
console.log('[DEBUG] API_BASE_URL para webhooks:', API_BASE_URL);

/**
 * Obtém o cabeçalho de autenticação JWT
 */
const getAuthHeader = () => {
  // Verificar primeiro se há um usuário armazenado no localStorage
  const storedUser = localStorage.getItem('fuelogic_user');
  
  if (storedUser) {
    try {
      // Tentar analisar o usuário armazenado
      const user = JSON.parse(storedUser);
      
      // Verificar se o token existe no objeto do usuário
      if (user && user.token) {
        return {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        };
      }
    } catch (error) {
      console.error('Erro ao analisar usuário do localStorage:', error);
    }
  }
  
  // Fallback para token antigo se o novo formato não estiver disponível
  const token = localStorage.getItem('token');
  if (token) {
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }
  
  // Se nenhum token for encontrado
  return {
    headers: {
      'Content-Type': 'application/json'
    }
  };
};

export interface Webhook {
  id?: number;
  type: string;
  name: string;
  url?: string;
  integration: 'slingflow' | 'generic' | 'sophia_ai';
  selected_contacts?: any; // JSONB field
  is_active?: boolean;
  method?: string;
  headers?: any; // JSONB field
  auth_type?: string;
  auth_config?: any; // JSONB field
  timeout_seconds?: number;
  retry_attempts?: number;
  retry_delay_seconds?: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string | number;
}

export interface InternalContact {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  tipo: string;
  classificacao: string;
}

const webhookApi = {
  /**
   * Busca todos os webhooks
   */
  async getAllWebhooks(): Promise<Webhook[]> {
    try {
      const response = await axios.get(API_BASE_URL, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao buscar webhooks: ${error.response?.status || 'Desconhecido'}`);
      }
      throw error;
    }
  },

  /**
   * Busca webhooks por tipo
   */
  async getWebhooksByType(type: string): Promise<Webhook[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/type/${type}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar webhooks por tipo ${type}:`, error);
      throw error;
    }
  },

  /**
   * Busca um webhook por ID
   */
  async getWebhookById(id: number): Promise<Webhook> {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}`, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao buscar webhook ${id}: ${error.response?.status || 'Desconhecido'}`);
      }
      throw error;
    }
  },

  /**
   * Busca contatos internos para seleção no SlingFlow
   */
  async getInternalContacts(): Promise<InternalContact[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/contatos/internos`, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao buscar contatos internos: ${error.response?.status || 'Desconhecido'}`);
      }
      throw error;
    }
  },

  /**
   * Cria um novo webhook
   */
  async createWebhook(webhookData: Webhook): Promise<Webhook> {
    try {
      const response = await axios.post(API_BASE_URL, webhookData, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao criar webhook: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },

  /**
   * Atualiza um webhook existente
   */
  async updateWebhook(id: number, webhookData: Webhook): Promise<Webhook> {
    try {
      const response = await axios.put(`${API_BASE_URL}/${id}`, webhookData, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao atualizar webhook: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },

  /**
   * Remove um webhook
   */
  async deleteWebhook(id: number): Promise<boolean> {
    try {
      await axios.delete(`${API_BASE_URL}/${id}`, getAuthHeader());
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao remover webhook: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },
  
  /**
   * Testa um webhook enviando uma requisição de teste
   */
  async testWebhook(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/${id}/test`, {}, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao testar webhook: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },
};

export default webhookApi;
