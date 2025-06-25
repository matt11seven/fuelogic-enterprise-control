import { TankData } from "../types/api";
import logger from '../utils/logger';
import authApi from './auth-api';

// URL base do backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Endpoint da API de tanques - agora usa o proxy do backend
export const API_ENDPOINT = `${API_BASE_URL}/tanks/data`;

/**
 * Busca os dados de todos os tanques da API usando a chave fornecida
 * @param apiKey - A chave de API para autorização
 */
export async function fetchTankData(apiKey: string | null): Promise<TankData[]> {
  try {
    if (!apiKey) {
      throw new Error("Chave de API não fornecida. Faça login para continuar.");
    }

    // Log para depuração - mostrar o endpoint sendo usado
    logger.log('Endpoint da API:', API_ENDPOINT);
    
    if (!API_ENDPOINT) {
      throw new Error("Endpoint da API não definido. Verifique a variável de ambiente VITE_API_BASE_URL.");
    }

    // Buscar o token JWT - necessário para acessar rotas protegidas no backend
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error("Token de autenticação não encontrado");
    }

    // Adiciona apiKey como parâmetro de consulta
    const url = new URL(API_ENDPOINT);
    url.searchParams.append('apiKey', apiKey);
    
    logger.log('Fazendo requisição para:', url.toString());
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}` // Adiciona o token JWT na requisição
      }
    });
    
    logger.log('Status da resposta:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
    }
    
    // Obter o texto da resposta primeiro para depuração
    const responseText = await response.text();
    logger.log('Corpo da resposta:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    
    // Se o texto estiver vazio, lançar um erro específico
    if (!responseText || responseText.trim() === '') {
      throw new Error('A API retornou uma resposta vazia');
    }
    
    try {
      // Tentar converter o texto para JSON
      const data: TankData[] = JSON.parse(responseText);
      return data;
    } catch (parseError) {
      logger.error('Erro ao fazer parse do JSON:', parseError);
      throw new Error(`Resposta inválida da API: ${parseError.message}`);
    }
  } catch (error) {
    logger.error("Erro ao buscar dados dos tanques:", error);
    throw error;
  }
}

/**
 * Agrupa os tanques por unidade (posto)
 */
export function groupTanksByStation(tanks: TankData[]): Record<string, TankData[]> {
  return tanks.reduce<Record<string, TankData[]>>((acc, tank) => {
    const stationName = tank.Unidade;
    
    if (!acc[stationName]) {
      acc[stationName] = [];
    }
    
    acc[stationName].push(tank);
    return acc;
  }, {});
}

/**
 * Mapeamento de códigos de produto para os códigos de exibição
 */
export function getProductCode(productName: string): string {
  const productMap: Record<string, string> = {
    'GASOLINA COMUM': 'GC',
    'GASOLINA GRID': 'GA',
    'GASOLINA ADITIVADA': 'GA',
    'GASOLINA PODIUM': 'GP',
    'DIESEL S10': 'S10',
    'DIESEL S10 GRID': 'S10A',
    'DIESEL COMUM': 'DS',
    'ETANOL': 'ET'
  };
  
  return productMap[productName.trim()] || 'XX';
}
