import { useQuery } from '@tanstack/react-query';
import { TankData } from '../types/api';
import { fetchTankData, getProductCode } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { getAllPostos, Posto } from '../services/stations-api';
import { getGMSyncStatus, getLatestGMMedicoes } from '../services/gasmobile-api';

export interface Tank {
  id: string;
  code: string;
  type: string;
  name: string;
  product: string;
  current: number;
  capacity: number;
  empty: number;
  waterAmount: number;
  temperature: number;
  date: string;
  apiData?: TankData;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  tanks: Tank[];
}

export interface TankDataAlert {
  level: 'warning' | 'error';
  title: string;
  message: string;
}

export function useTankData() {
  const { apiKey } = useAuth();
  const STORAGE_KEY = 'fuelogic_station_data';
  const [dataAlert, setDataAlert] = useState<TankDataAlert | null>(null);

  const result = useQuery({
    queryKey: ['tanks', apiKey],
    queryFn: async () => {
      const postos = await getAllPostos().catch(() => [] as Posto[]);

      const [localMedicoesResult, syncStatusResult] = await Promise.all([
        getLatestGMMedicoes().catch(() => null),
        getGMSyncStatus().catch(() => null),
      ]);

      const localRows = localMedicoesResult?.rows || [];
      const hasLocalData = localRows.length > 0;

      const intervalMs = Number(syncStatusResult?.interval_ms || 20 * 60 * 1000);
      const staleThresholdMs = Number(syncStatusResult?.stale_threshold_ms || intervalMs * 2);

      const latestLocalIso = localMedicoesResult?.latest_measured_at || null;
      const latestLocalTs = latestLocalIso ? new Date(latestLocalIso).getTime() : 0;
      const nowTs = Date.now();
      const isLocalStale = !latestLocalTs || (nowTs - latestLocalTs > staleThresholdMs);

      const staleMinutes = latestLocalTs
        ? Math.floor((nowTs - latestLocalTs) / 60000)
        : null;
      const staleLimitMinutes = Math.floor(staleThresholdMs / 60000);

      const fetchFromApiWithReason = async (reasonTitle: string, reasonMessage: string) => {
        try {
          const tankData = await fetchTankData(apiKey);
          localStorage.setItem('fuelogic_raw_tank_data', JSON.stringify(tankData));
          setDataAlert({
            level: 'warning',
            title: reasonTitle,
            message: `${reasonMessage} Exibindo medições da API em tempo real.`,
          });
          return { tankData, postos };
        } catch (apiError) {
          const apiMessage = apiError instanceof Error ? apiError.message : 'falha desconhecida';

          if (hasLocalData) {
            setDataAlert({
              level: 'error',
              title: 'Falha na atualização em tempo real',
              message: `${reasonMessage} Falha ao consultar API (${apiMessage}). Exibindo últimos dados do banco.`,
            });
            return { tankData: localRows, postos };
          }

          const savedData = localStorage.getItem('fuelogic_raw_tank_data');
          if (savedData) {
            setDataAlert({
              level: 'error',
              title: 'Sem dados atualizados disponíveis',
              message: `Banco sem dados válidos e API indisponível (${apiMessage}). Exibindo cache local.`,
            });
            return { tankData: JSON.parse(savedData) as TankData[], postos };
          }

          throw apiError;
        }
      };

      // Banco-first: se temos dados locais e estão atualizados, usa banco.
      if (hasLocalData && !isLocalStale) {
        setDataAlert(null);
        localStorage.setItem('fuelogic_raw_tank_data', JSON.stringify(localRows));
        return { tankData: localRows, postos };
      }

      // Banco desatualizado: tenta API e alerta em amarelo quando conseguir.
      if (hasLocalData && isLocalStale) {
        const reason = latestLocalTs
          ? `Banco desatualizado (${staleMinutes} min sem nova medição; limite ${staleLimitMinutes} min).`
          : 'Banco sem timestamp válido de medição.';
        return fetchFromApiWithReason('Dados locais desatualizados', reason);
      }

      // Banco sem medições: tenta API e alerta em amarelo quando conseguir.
      if (!hasLocalData) {
        return fetchFromApiWithReason(
          'Banco sem medições',
          'Nenhuma medição encontrada no banco local.',
        );
      }

      // Fallback defensivo.
      try {
        const tankData = await fetchTankData(apiKey);
        localStorage.setItem('fuelogic_raw_tank_data', JSON.stringify(tankData));
        setDataAlert(null);
        return { tankData, postos };
      } catch (error) {
        const savedData = localStorage.getItem('fuelogic_raw_tank_data');
        if (savedData) {
          setDataAlert({
            level: 'error',
            title: 'Falha na leitura de dados',
            message: `Banco e API indisponíveis. Exibindo cache local. Motivo: ${(error as Error).message}`,
          });
          return { tankData: JSON.parse(savedData) as TankData[], postos };
        }
        throw error;
      }
    },
    enabled: !!apiKey,
    select: ({ tankData, postos }: { tankData: TankData[]; postos: Posto[] }): Station[] => {
      const postosPorUnidade = new Map<string, Posto>();
      for (const posto of postos) {
        const unidadeKey = String(posto.id_unidade || '').trim();
        if (unidadeKey) {
          postosPorUnidade.set(unidadeKey, posto);
        }
      }

      const groupedByUnidadeId = tankData.reduce<Record<string, TankData[]>>((acc, tank) => {
        const key = String(tank.IdUnidade || tank.Unidade || tank.Id);
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(tank);
        return acc;
      }, {});

      const stations = Object.values(groupedByUnidadeId).map((tanques, index) => {
        const firstTank = tanques[0];
        const sortedTanks = tanques.sort((a, b) => (a.Tanque || 0) - (b.Tanque || 0));
        const unidadeNome = firstTank.Unidade;
        const postoDoBanco = postosPorUnidade.get(String(firstTank.IdUnidade));
        const nomeBanco = (postoDoBanco?.nome || '').trim();
        const nomeFallback = firstTank.Cliente ? `${firstTank.Cliente} - ${unidadeNome}` : unidadeNome;
        const nomeResolvido = nomeBanco || nomeFallback;

        return {
          id: `station-${firstTank.IdUnidade || index}`,
          name: nomeResolvido,
          address: `Unidade ${nomeResolvido}`,
          tanks: sortedTanks.map((tank) => ({
            id: `tank-${tank.Id}`,
            code: getProductCode(tank.Produto),
            type: tank.Produto.trim(),
            name: `Tanque ${tank.Tanque || ''}`.trim(),
            product: tank.Produto.trim(),
            current: tank.QuantidadeAtual,
            capacity: tank.CapacidadeDoTanque,
            empty: tank.QuantidadeVazia,
            waterAmount: tank.QuantidadeDeAgua,
            temperature: tank.Temperatura,
            date: tank.DataMedicao,
            apiData: {
              ...tank,
              Unidade: nomeResolvido,
            },
          })),
        };
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(stations));
      return stations;
    },
    refetchInterval: 20 * 60 * 1000,
    staleTime: 20 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
  });

  useEffect(() => {
    if (result.isError || (!result.data && !result.isFetching)) {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          console.log('Recuperando dados do localStorage apos erro');
        }
      } catch (e) {
        console.error('Erro ao ler dados do localStorage:', e);
      }
    }
  }, [result.isError]);

  return { ...result, dataAlert };
}
