import { useQuery } from '@tanstack/react-query';
import { TankData } from '../types/api';
import { fetchTankData, groupTanksByStation, getProductCode } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface Tank {
  id: string;
  code: string;
  type: string;
  current: number;
  capacity: number;
  empty: number;
  waterAmount: number;
  temperature: number;
  date: string;
  apiData?: TankData; // Dados completos da API para uso na visualização expandida
}

export interface Station {
  id: string;
  name: string;
  address: string;
  tanks: Tank[];
}

export function useTankData() {
  const { apiKey } = useAuth();
  
  return useQuery({
    queryKey: ['tanks', apiKey],
    queryFn: () => fetchTankData(apiKey),
    enabled: !!apiKey, // Só executa a query se tiver uma API key
    select: (data: TankData[]): Station[] => {
      // Agrupar tanques por unidade (posto)
      const tankGroups = groupTanksByStation(data);

      // Converter para o formato esperado pelos componentes
      return Object.entries(tankGroups).map(([unidadeNome, tanques], index) => {
        const firstTank = tanques[0];
        
        return {
          id: `station-${firstTank.IdUnidade || index}`,
          name: firstTank.Cliente ? `${firstTank.Cliente} - ${unidadeNome}` : unidadeNome,
          address: `Unidade ${unidadeNome}`,
          tanks: tanques.map(tank => ({
            id: `tank-${tank.Id}`,
            code: getProductCode(tank.Produto),
            type: tank.Produto.trim(),
            current: tank.QuantidadeAtual,
            capacity: tank.CapacidadeDoTanque,
            empty: tank.QuantidadeVazia,
            waterAmount: tank.QuantidadeDeAgua,
            temperature: tank.Temperatura,
            date: tank.DataMedicao,
            apiData: tank // Incluir dados completos da API para cada tanque
          }))
        };
      });
    },
    // Refetch a cada 5 minutos
    refetchInterval: 5 * 60 * 1000,
    // Usar dados em cache se estiverem disponíveis
    staleTime: 60 * 1000
  });
}
