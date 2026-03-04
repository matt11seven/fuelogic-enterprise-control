import axios from 'axios';
import { TankData } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_BASE_URL = BASE_URL.endsWith('/api')
  ? `${BASE_URL}/gasmobile`
  : `${BASE_URL}/api/gasmobile`;

const getAuthHeader = () => {
  const storedUser = localStorage.getItem('fuelogic_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user?.token) return { Authorization: `Bearer ${user.token}` };
    } catch {
      // Ignora token malformado no storage e tenta fallback abaixo.
    }
  }
  const token = localStorage.getItem('token');
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
};

export interface GMTanquePreview {
  numero_tanque: number;
  produto: string;
  capacidade: number;
  capacidade_menos_10_porcento: number;
  // exibição no preview (dados ao vivo, não gravados no banco)
  nivel_percentual: number;
  quantidade_atual: number;
  status: 'novo' | 'existente';
  existing_id: number | null;
}

export interface GMPostoPreview {
  id_unidade: number;
  nome: string;
  nome_atual: string;
  cliente_gm: string;
  nome_gasmobile?: string;
  cliente_gm_gasmobile?: string;
  indice_equipamento: number;
  status: 'novo' | 'existente';
  existing_id: number | null;
  tanques: GMTanquePreview[];
}

export interface GMCombustivelPreview {
  nome: string;
  status: 'novo' | 'existente';
  existing_id: number | null;
}

export interface GMPreview {
  postos: GMPostoPreview[];
  combustiveis: GMCombustivelPreview[];
}

export interface GMImportPayload {
  postos: GMPostoPreview[];
  combustiveis: GMCombustivelPreview[];
}

export interface GMLatestMedicoesResponse {
  success: boolean;
  count: number;
  latest_measured_at: string | null;
  rows: TankData[];
}

export interface GMSyncStatusResponse {
  success: boolean;
  enabled: boolean;
  running: boolean;
  interval_ms: number;
  stale_threshold_ms: number;
  last_cycle_at: string | null;
  last_cycle_result: {
    started_at: string;
    users_total: number;
    users_success: number;
    users_failed: number;
    error: string | null;
  } | null;
}

export const getGMPreview = async (): Promise<GMPreview> => {
  const response = await axios.get(`${API_BASE_URL}/preview`, { headers: getAuthHeader() });
  return response.data;
};

export const importGMData = async (payload: GMImportPayload): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/import`, payload, { headers: getAuthHeader() });
  return response.data;
};

export const getLatestGMMedicoes = async (): Promise<GMLatestMedicoesResponse> => {
  const response = await axios.get(`${API_BASE_URL}/medicoes/latest`, { headers: getAuthHeader() });
  const data = response?.data || {};
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return {
    success: !!data.success,
    count: Number(data.count || rows.length || 0),
    latest_measured_at: data.latest_measured_at || null,
    rows,
  };
};

export const getGMSyncStatus = async (): Promise<GMSyncStatusResponse> => {
  const response = await axios.get(`${API_BASE_URL}/sync-status`, { headers: getAuthHeader() });
  return response.data;
};

export default { getGMPreview, importGMData, getLatestGMMedicoes, getGMSyncStatus };
