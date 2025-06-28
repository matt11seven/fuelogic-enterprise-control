import axios from 'axios';

// Definindo a URL base da API de acordo com o ambiente
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Removendo /api do BASE_URL se já estiver presente para evitar duplicação
const API_BASE_URL = BASE_URL.endsWith('/api') 
  ? `${BASE_URL}/inspection-alerts`
  : `${BASE_URL}/api/inspection-alerts`;

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
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Não autenticado');
    }
    
    const response = await axios.post(
      `${API_BASE_URL}/inspection-alerts/send`,
      { tankData },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Erro ao enviar alerta de inspeção');
    }
    
    throw new Error('Erro de conexão ao enviar alerta de inspeção');
  }
};

export default {
  sendInspectionAlert,
};
