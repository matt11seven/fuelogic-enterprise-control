import { TankData } from "../types/api";

export const API_ENDPOINT = import.meta.env.VITE_TANKS_ENDPOINT;
export const API_KEY = import.meta.env.VITE_API_KEY;

/**
 * Busca os dados de todos os tanques da API
 */
export async function fetchTankData(): Promise<TankData[]> {
  try {
    // Adiciona apiKey como parâmetro de consulta
    const url = new URL(API_ENDPOINT);
    url.searchParams.append('apiKey', API_KEY);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status}`);
    }
    
    const data: TankData[] = await response.json();
    return data;
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
