import axios from 'axios';

// Definindo a URL base da API de acordo com o ambiente
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Criando a instância do axios para a API de configurações
const configApi = axios.create({
  baseURL: `${BASE_URL}/configurations`,
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface ConfigurationSettings {
  id?: number;
  threshold_critico: number;
  threshold_atencao: number;
}

// Valores padrão para as configurações de threshold
export const DEFAULT_THRESHOLDS = {
  threshold_critico: 20,
  threshold_atencao: 50
};

// Token interceptor para adicionar o token de autenticação em todas as requisições
configApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

/**
 * Obter as configurações do usuário atual
 */
const getConfigurations = async (): Promise<ConfigurationSettings> => {
  try {
    const response = await configApi.get('/');
    return response.data;
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    // Retorna valores padrão em caso de erro
    return DEFAULT_THRESHOLDS;
  }
};

/**
 * Atualizar as configurações do usuário atual
 * @param settings Configurações a serem atualizadas
 */
const updateConfigurations = async (settings: Omit<ConfigurationSettings, 'id'>): Promise<ConfigurationSettings> => {
  try {
    // Verificar se existe token antes de fazer a requisição
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }
    
    const response = await configApi.put('/', settings);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    throw error; // Re-lança o erro para ser tratado pelo componente
  }
};

/**
 * Calcular o status de um tanque com base nas configurações do usuário
 * @param percentual Percentual atual do tanque
 */
const getStatus = async (percentual: number): Promise<{ status: 'critico' | 'atencao' | 'operacional' }> => {
  try {
    const response = await configApi.get(`/status?percentual=${percentual}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter status:', error);
    // Calcula status localmente em caso de erro na API
    const configs = await getConfigurations();
    
    if (percentual < configs.threshold_critico) {
      return { status: 'critico' };
    } else if (percentual < configs.threshold_atencao) {
      return { status: 'atencao' };
    } else {
      return { status: 'operacional' };
    }
  }
};

/**
 * Verifica se um percentual está em estado crítico (abaixo do threshold_critico)
 * @param percentual Percentual a ser verificado
 * @param configs Configurações a serem usadas (opcional)
 */
const isCritical = async (percentual: number, configs?: ConfigurationSettings): Promise<boolean> => {
  const settings = configs || await getConfigurations();
  return percentual < settings.threshold_critico;
};

/**
 * Verifica se um percentual está em estado de atenção (entre threshold_critico e threshold_atencao)
 * @param percentual Percentual a ser verificado
 * @param configs Configurações a serem usadas (opcional)
 */
const needsAttention = async (percentual: number, configs?: ConfigurationSettings): Promise<boolean> => {
  const settings = configs || await getConfigurations();
  return percentual >= settings.threshold_critico && percentual < settings.threshold_atencao;
};

// API para gerenciar configurações do sistema
const ConfigurationAPI = {
  getConfigurations,
  updateConfigurations,
  getStatus,
  isCritical,
  needsAttention,
  DEFAULT_THRESHOLDS
};

export default ConfigurationAPI;
