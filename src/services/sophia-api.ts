/**
 * API cliente para integração com o serviço da IA Sophia
 * Permite enviar pedidos agrupados por empresa para processamento inteligente
 */
import axios from 'axios';

// Definindo a URL base da API de acordo com o ambiente
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Criando a instância do axios para a API da Sophia
const API_BASE_URL = `${BASE_URL}/api/sophia`;

// Interface para o resultado do envio de pedidos para a Sophia
export interface SophiaOrderSendResult {
  success: boolean;
  message: string;
  details?: {
    empresas: number;
    pedidos: number;
    tipos_combustivel: number;
  }
}

// Interface para o exemplo de payload da Sophia
export interface SophiaPayloadExample {
  event_id: string;
  event_type: string;
  timestamp: string;
  pedido: {
    data_solicitacao: string;
    status: string;
    empresas: Array<{
      nome: string;
      cnpj: string;
      endereco: string;
      cidade: string;
      estado: string;
      pedidos: Array<{
        id: number;
        tank_id: number;
        product_type: string;
        quantity: number;
        scheduled_date: string;
        notes: string | null;
      }>;
      totais_por_combustivel: Record<string, number>;
    }>;
    resumo: {
      total_combustiveis: Record<string, number>;
      quantidade_total: number;
      data_entrega_estimada: string;
    }
  };
  metadata: {
    source: string;
    version: string;
    gerado_por: string;
    interface: string;
  }
}

// Função para obter o token JWT do localStorage
const getAuthHeader = () => {
  const storedUser = localStorage.getItem('fuelogic_user');
  
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user && user.token) {
        return { Authorization: `Bearer ${user.token}` };
      }
    } catch (error) {
      console.error('Erro ao obter token JWT:', error);
    }
  }
  
  console.warn('Token JWT não encontrado no localStorage');
  return {};
};

/**
 * API para integração com a IA Sophia
 */
const SophiaAPI = {
  /**
   * Envia pedidos selecionados para a IA Sophia
   * @param orderIds IDs dos pedidos a serem enviados
   * @param webhookId ID do webhook configurado para a IA Sophia
   * @returns Resultado do envio
   */
  async sendOrdersToSophia(orderIds: number[], webhookId: number): Promise<SophiaOrderSendResult> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/orders/send`, 
        { orderIds, webhookId },
        { headers: getAuthHeader() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar pedidos para IA Sophia:', error);
      throw new Error(
        error.response?.data?.error || 
        'Falha ao enviar pedidos para a IA Sophia. Tente novamente mais tarde.'
      );
    }
  },
  
  /**
   * Processa todos os pedidos pendentes e envia para a IA Sophia
   * @param webhookId ID do webhook configurado para a IA Sophia
   * @returns Resultado do processamento
   */
  async processPendingOrders(webhookId: number): Promise<SophiaOrderSendResult> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/orders/process-pending/${webhookId}`,
        {},
        { headers: getAuthHeader() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erro ao processar pedidos pendentes:', error);
      throw new Error(
        error.response?.data?.error || 
        'Falha ao processar pedidos pendentes. Tente novamente mais tarde.'
      );
    }
  },
  
  /**
   * Obtém um exemplo do formato do payload da Sophia
   * @returns Exemplo de payload
   */
  async getPayloadExample(): Promise<SophiaPayloadExample> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payload-example`,
        { headers: getAuthHeader() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erro ao obter exemplo de payload:', error);
      throw new Error(
        error.response?.data?.error || 
        'Falha ao obter exemplo de payload. Tente novamente mais tarde.'
      );
    }
  }
};

export default SophiaAPI;
