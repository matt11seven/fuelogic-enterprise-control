import { useQuery } from '@tanstack/react-query';
import { TankData } from '../types/api';
import { fetchTankData, groupTanksByStation, getProductCode } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react'; // Adicionado import de useEffect

export interface Tank {
  id: string;
  code: string;
  type: string;
  name: string;      // Nome do tanque
  product: string;   // Tipo de combustível/produto armazenado
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
  
  // Nome da chave para armazenamento no localStorage
  const STORAGE_KEY = 'fuelogic_station_data';
  
  // Cache time aumentado para garantir que dados offline sejam mantidos
  const result = useQuery({
    queryKey: ['tanks', apiKey],
    queryFn: async () => {
      try {
        // Tentar buscar dados da API
        const data = await fetchTankData(apiKey);
        
        // Salvar os dados brutos da API no localStorage
        localStorage.setItem('fuelogic_raw_tank_data', JSON.stringify(data));
        
        return data;
      } catch (error) {
        console.error('Erro ao buscar dados da API:', error);
        
        // Em caso de erro, tentar recuperar os dados do localStorage
        const savedData = localStorage.getItem('fuelogic_raw_tank_data');
        if (savedData) {
          console.log('Usando dados em cache do localStorage');
          return JSON.parse(savedData);
        }
        
        // Se não houver dados salvos, propaga o erro
        throw error;
      }
    },
    enabled: !!apiKey, // Só executa a query se tiver uma API key
    select: (data: TankData[]): Station[] => {
      // Agrupar tanques por unidade (posto)
      const tankGroups = groupTanksByStation(data);

      // Converter para o formato esperado pelos componentes
      const stations = Object.entries(tankGroups).map(([unidadeNome, tanques], index) => {
        const firstTank = tanques[0];
        
        // Ordenar tanques por número dentro de cada estação
        const sortedTanks = tanques.sort((a, b) => (a.Tanque || 0) - (b.Tanque || 0));
        
        return {
          id: `station-${firstTank.IdUnidade || index}`,
          name: firstTank.Cliente ? `${firstTank.Cliente} - ${unidadeNome}` : unidadeNome,
          address: `Unidade ${unidadeNome}`,
          tanks: sortedTanks.map(tank => ({
            id: `tank-${tank.Id}`,
            code: getProductCode(tank.Produto),
            type: tank.Produto.trim(),
            name: `Tanque ${tank.Tanque || ''}`.trim(), // Nome do tanque baseado no número
            product: tank.Produto.trim(),              // Nome do produto/combustível
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
      
      // Salvar os dados formatados no localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stations));
      
      return stations;
    },
    // Refetch a cada 5 minutos
    refetchInterval: 5 * 60 * 1000,
    // Usar dados em cache se estiverem disponíveis
    staleTime: 60 * 1000,
    // Manter dados em cache por 1 dia mesmo após browser refresh
    gcTime: 24 * 60 * 60 * 1000,
    // Usar dados em cache durante a refetch para melhor experiência offline
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3
  });
  
  // Ao montar o componente, verificar se temos dados no localStorage
  useEffect(() => {
    // Se a query falhou e não temos dados retornados, tentar recuperar do localStorage
    if (result.isError || (!result.data && !result.isFetching)) {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          console.log('Recuperando dados do localStorage após erro');
          // Não podemos atualizar o estado do React Query diretamente,
          // mas podemos notificar o usuário que estamos usando dados em cache
        }
      } catch (e) {
        console.error('Erro ao ler dados do localStorage:', e);
      }
    }
  }, [result.isError]);
  
  return result;
}
