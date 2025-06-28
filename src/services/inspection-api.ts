import axios from 'axios';
import { API_BASE_URL } from '@/config';

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
