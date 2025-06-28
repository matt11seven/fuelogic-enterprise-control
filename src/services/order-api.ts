import axios from 'axios';

// Definindo a URL base da API de acordo com o ambiente - sem duplicar /api
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Removendo /api do BASE_URL se já estiver presente para evitar duplicação
const API_BASE_URL = BASE_URL.endsWith('/api') 
  ? `${BASE_URL}/orders`
  : `${BASE_URL}/api/orders`;

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

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface Order {
  id?: number;
  user_id?: number;
  station_id: string;
  tank_id: string;
  product_type: string;
  quantity: number;
  status?: OrderStatus;
  notes?: string;
  webhook_id?: number;
  notification_sent?: boolean;
  scheduled_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderFilter {
  station_id?: string;
  tank_id?: string;
  status?: OrderStatus;
  start_date?: string;
  end_date?: string;
}

/**
 * API para gerenciamento de pedidos de abastecimento
 */
const orderApi = {
  /**
   * Busca todos os pedidos ou filtra por parâmetros
   * @param filter Filtros opcionais para a consulta
   */
  async getOrders(filter?: OrderFilter): Promise<Order[]> {
    try {
      const response = await axios.get(API_BASE_URL, {
        ...getAuthHeader(),
        params: filter
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao buscar pedidos: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },

  /**
   * Busca um pedido específico pelo ID
   * @param id ID do pedido
   */
  async getOrderById(id: number): Promise<Order> {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}`, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao buscar pedido ${id}: ${error.response?.status || 'Desconhecido'}`);
      }
      throw error;
    }
  },

  /**
   * Busca pedidos para uma estação (posto) específica
   * @param stationId ID da estação
   */
  async getOrdersByStation(stationId: string): Promise<Order[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/station/${stationId}`, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao buscar pedidos da estação ${stationId}: ${error.response?.status || 'Desconhecido'}`);
      }
      throw error;
    }
  },

  /**
   * Cria um novo pedido
   * @param orderData Dados do pedido a ser criado
   */
  async createOrder(orderData: Order): Promise<Order> {
    try {
      const response = await axios.post(API_BASE_URL, orderData, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao criar pedido: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },

  /**
   * Cria múltiplos pedidos em uma única requisição
   * @param ordersData Array com dados de vários pedidos
   */
  async createBulkOrders(ordersData: Order[]): Promise<Order[]> {
    try {
      const response = await axios.post(`${API_BASE_URL}/bulk`, ordersData, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao criar pedidos em lote: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },

  /**
   * Atualiza um pedido existente
   * @param id ID do pedido
   * @param orderData Novos dados do pedido
   */
  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order> {
    try {
      const response = await axios.put(`${API_BASE_URL}/${id}`, orderData, getAuthHeader());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao atualizar pedido: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },

  /**
   * Atualiza o status de um pedido
   * @param id ID do pedido
   * @param status Novo status
   */
  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/${id}/status`, 
        { status }, 
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao atualizar status do pedido: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },

  /**
   * Remove um pedido
   * @param id ID do pedido
   */
  async deleteOrder(id: number): Promise<boolean> {
    try {
      await axios.delete(`${API_BASE_URL}/${id}`, getAuthHeader());
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao remover pedido: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },

  /**
   * Vincula um pedido a um webhook específico para notificação
   * @param orderId ID do pedido
   * @param webhookId ID do webhook
   */
  async linkOrderToWebhook(orderId: number, webhookId: number): Promise<Order> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/${orderId}/webhook/${webhookId}`,
        {},
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao vincular pedido ao webhook: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },

  /**
   * Envia uma notificação de pedido através do webhook vinculado
   * @param orderId ID do pedido
   */
  async sendOrderNotification(orderId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/${orderId}/notify`,
        {},
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao enviar notificação do pedido: ${error.response?.status || 'Desconhecido'} - ${error.response?.data?.message || ''}`);
      }
      throw error;
    }
  },
  
  /**
   * Obtém estatísticas de pedidos por período
   * @param startDate Data inicial
   * @param endDate Data final
   */
  async getOrderStats(startDate: string, endDate: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/stats`, 
        {
          ...getAuthHeader(),
          params: { start_date: startDate, end_date: endDate }
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao obter estatísticas de pedidos: ${error.response?.status || 'Desconhecido'}`);
      }
      throw error;
    }
  }
};

export default orderApi;
