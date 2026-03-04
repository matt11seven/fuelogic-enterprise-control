import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_BASE_URL = BASE_URL.endsWith('/api')
  ? `${BASE_URL}/combustiveis`
  : `${BASE_URL}/api/combustiveis`;

const getAuthHeader = () => {
  const storedUser = localStorage.getItem('fuelogic_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user?.token) return { Authorization: `Bearer ${user.token}` };
    } catch {}
  }
  const token = localStorage.getItem('token');
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
};

export interface Combustivel {
  id?: number;
  nome: string;
  codigo?: string;
  unidade: 'litros' | 'm3';
  status: 'ativo' | 'inativo';
  created_at?: string;
  updated_at?: string;
}

export interface PostoCombustivel {
  id?: number;
  posto_id: number;
  combustivel_id: number;
  codigo_erp?: string;
  status?: string;
  nome?: string;
  codigo?: string;
  unidade?: string;
}

export const getAllCombustiveis = async (): Promise<Combustivel[]> => {
  try {
    const response = await axios.get(API_BASE_URL, { headers: getAuthHeader() });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Erro ao buscar combustíveis:', error);
    return [];
  }
};

export const createCombustivel = async (combustivel: Combustivel): Promise<Combustivel> => {
  const response = await axios.post(API_BASE_URL, combustivel, { headers: getAuthHeader() });
  return response.data;
};

export const updateCombustivel = async (id: number, combustivel: Combustivel): Promise<Combustivel> => {
  const response = await axios.put(`${API_BASE_URL}/${id}`, combustivel, { headers: getAuthHeader() });
  return response.data;
};

export const deleteCombustivel = async (id: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/${id}`, { headers: getAuthHeader() });
};

export const getCombustiveisByPosto = async (postoId: number): Promise<PostoCombustivel[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/posto/${postoId}`, { headers: getAuthHeader() });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Erro ao buscar combustíveis do posto:', error);
    return [];
  }
};

export const vincularCombustivelPosto = async (postoId: number, data: { combustivel_id: number; codigo_erp?: string }): Promise<PostoCombustivel> => {
  const response = await axios.post(`${API_BASE_URL}/posto/${postoId}`, data, { headers: getAuthHeader() });
  return response.data;
};

export const atualizarVinculo = async (postoId: number, id: number, codigo_erp: string): Promise<PostoCombustivel> => {
  const response = await axios.put(`${API_BASE_URL}/posto/${postoId}/${id}`, { codigo_erp }, { headers: getAuthHeader() });
  return response.data;
};

export const removerVinculo = async (postoId: number, id: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/posto/${postoId}/${id}`, { headers: getAuthHeader() });
};

export default {
  getAllCombustiveis,
  createCombustivel,
  updateCombustivel,
  deleteCombustivel,
  getCombustiveisByPosto,
  vincularCombustivelPosto,
  atualizarVinculo,
  removerVinculo
};
