import axios from 'axios';

// Definindo a URL base da API de acordo com o ambiente
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Construindo a URL da API corretamente
const API_BASE_URL = BASE_URL.endsWith('/api') 
  ? `${BASE_URL}/inspection-alerts`
  : `${BASE_URL}/api/inspection-alerts`;

// Log para depuração
console.log('Inspeção API Base URL:', API_BASE_URL);

/**
 * Obtém o cabeçalho de autenticação JWT - mesmo método usado em webhook-api.ts
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
        console.log('Token encontrado no objeto fuelogic_user');
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
    console.log('Token encontrado diretamente como token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }
  
  // Se nenhum token for encontrado
  console.log('Nenhum token encontrado');
  return {
    headers: {
      'Content-Type': 'application/json'
    }
  };
};

// Interfaces para dados do tanque
export interface TankInspectionData {
  Cliente: string;
  Unidade: string;
  Tanque: number;
  Produto: string;
  QuantidadeDeAgua: number;
  DataMedicao: string;
  [key: string]: any; // Para outros campos que possam existir
}

// Interface para resposta do servidor
export interface InspectionAlertResponse {
  success: boolean;
  message: string;
  resultados: {
    webhook_id: number;
    name: string;
    success: boolean;
    status?: number;
    data?: any;
    error?: string;
  }[];
}

/**
 * Envia dados de inspeção de tanque para alertas de webhook
 * @param tankData Array com dados dos tanques para inspeção
 * @returns Resposta com resultados da entrega dos alertas
 */
export const sendInspectionAlert = async (tankData: TankInspectionData[]): Promise<InspectionAlertResponse> => {
  try {
    // Obter cabeçalhos de autenticação usando a mesma função de webhook-api.ts
    const authConfig = getAuthHeader();
    
    // Log para depuração - mostrar cabeçalhos sem expor o token completo
    console.log('Headers para requisição:', { 
      ...authConfig.headers,
      'Authorization': authConfig.headers.Authorization ? 
        'Bearer ' + authConfig.headers.Authorization.substring(7, 15) + '...[truncado]' : 
        'Ausente'
    });

    // Log para depurar a URL completa e os dados
    const url = `${API_BASE_URL}/send`;
    console.log('Enviando inspeção para URL:', url);
    console.log('Dados:', tankData);
    
    const response = await axios.post(
      url,
      { tankData },
      authConfig
    );
    
    console.log('Resposta recebida:', response.status, response.data);
    return response.data;
  } catch (error: any) {
    console.error('Erro detalhado ao enviar alerta:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Erro com resposta do servidor
        console.error('Erro de resposta:', error.response.status, error.response.data);
        throw new Error(error.response.data.message || error.response.data.error || `Erro ${error.response.status} ao enviar alerta de inspeção`);
      } else if (error.request) {
        // Erro sem resposta do servidor (problema de conectividade)
        console.error('Erro de request sem resposta:', error.request);
        throw new Error('Servidor não respondeu à requisição. Verifique se o servidor está rodando.');
      } 
    }
    
    // Erro genérico
    throw new Error(`Erro de conexão: ${error.message || 'Desconhecido'}`);
  }
};

export default {
  sendInspectionAlert,
};
