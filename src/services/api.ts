import { TankData } from "../types/api";

export const API_ENDPOINT = import.meta.env.VITE_TANKS_ENDPOINT;

/**
 * Busca os dados de todos os tanques da API usando a chave fornecida
 * @param apiKey - A chave de API para autorização
 */
export async function fetchTankData(apiKey: string | null): Promise<TankData[]> {
  try {
    if (!apiKey) {
      throw new Error("Chave de API não fornecida. Faça login para continuar.");
    }

    // Adiciona apiKey como parâmetro de consulta
    const url = new URL(API_ENDPOINT);
    url.searchParams.append('apiKey', apiKey);
    
    // Logs de depuração apenas em ambiente de desenvolvimento
    const isDev = import.meta.env.VITE_NODE_ENV === 'development';
    if (isDev) {
      console.log("[DEBUG] Ambiente:", import.meta.env.VITE_NODE_ENV);
      console.log("[DEBUG] Endpoint de tanques:", API_ENDPOINT);
      console.log("[DEBUG] URL completa:", url.toString());
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Log do status da resposta apenas em ambiente de desenvolvimento
    if (isDev) {
      console.log("[DEBUG] Status da resposta:", response.status);
      console.log("[DEBUG] Headers:", [...response.headers.entries()]);
    }
    
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status}`);
    }
    
    // Verificar se há conteúdo na resposta antes de tentar fazer o parse
    const text = await response.text();
    if (!text || text.trim() === '') {
      console.warn('API retornou uma resposta vazia');
      return [];
    }
    
    try {
      const data: TankData[] = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Erro ao processar JSON da resposta:', error);
      throw new Error(`Erro ao processar resposta da API: ${error.message}`);
    }
  } catch (error) {
    console.error("Erro ao buscar dados dos tanques:", error);
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
