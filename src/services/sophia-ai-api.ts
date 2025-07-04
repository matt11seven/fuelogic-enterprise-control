import axios from 'axios';

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
      
      // Verificar se o token está presente
      if (user && user.token) {
        return {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        };
      }
    } catch (e) {
      console.error('Erro ao analisar usuário armazenado:', e);
    }
  }
  
  // Se não houver token válido, retornar um objeto vazio
  return {};
};

// URL base para a API da Sophia AI
// Usa uma variável específica para Sophia ou faz fallback para a URL base da API + /sophia-ai
const API_BASE_URL = import.meta.env.VITE_SOPHIA_API_URL || 
  (import.meta.env.VITE_API_BASE_URL 
    ? `${import.meta.env.VITE_API_BASE_URL}/sophia-ai` 
    : `/api/sophia-ai`);

export interface SophiaAIMessage {
  message: string;
  userId: string;
  userName: string;
}

export interface SophiaAIResponse {
  message: string;
  timestamp: string;
  sessionId?: string;
}

/**
 * API para comunicação com o serviço da Sophia AI
 */
export class SophiaAIApi {
  /**
   * Envia uma mensagem para a Sophia AI e recebe a resposta
   */
  async sendMessage(data: SophiaAIMessage): Promise<SophiaAIResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat`, 
        data, 
        getAuthHeader()
      );
      
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar mensagem para Sophia AI:', error);
      throw error;
    }
  }

  /**
   * Obtém histórico de mensagens de uma sessão específica
   */
  async getChatHistory(sessionId: string): Promise<SophiaAIResponse[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/history/${sessionId}`, 
        getAuthHeader()
      );
      
      return response.data;
    } catch (error) {
      console.error('Erro ao obter histórico de chat:', error);
      throw error;
    }
  }
}

// Singleton para uso em todo o aplicativo
export const sophiaAIApi = new SophiaAIApi();

export default sophiaAIApi;
