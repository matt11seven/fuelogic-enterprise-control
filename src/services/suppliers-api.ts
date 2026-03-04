import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_BASE_URL = BASE_URL.endsWith('/api')
  ? `${BASE_URL}/fornecedores`
  : `${BASE_URL}/api/fornecedores`;

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

export interface Fornecedor {
  id?: number;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  contato_comercial?: string;
  prazo_entrega_dias?: number;
  observacoes?: string;
  status: 'ativo' | 'inativo';
  combustivel_ids?: number[];
  combustiveis?: any[];
  created_at?: string;
  updated_at?: string;
}

export const getAllFornecedores = async (params?: { q?: string; status?: string }): Promise<Fornecedor[]> => {
  try {
    const response = await axios.get(API_BASE_URL, {
      params,
      headers: getAuthHeader()
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    return [];
  }
};

export const getFornecedorById = async (id: number): Promise<Fornecedor> => {
  const response = await axios.get(`${API_BASE_URL}/${id}`, { headers: getAuthHeader() });
  return response.data;
};

export const createFornecedor = async (fornecedor: Fornecedor): Promise<Fornecedor> => {
  const response = await axios.post(API_BASE_URL, fornecedor, { headers: getAuthHeader() });
  return response.data;
};

export const updateFornecedor = async (id: number, fornecedor: Fornecedor): Promise<Fornecedor> => {
  const response = await axios.put(`${API_BASE_URL}/${id}`, fornecedor, { headers: getAuthHeader() });
  return response.data;
};

export const deleteFornecedor = async (id: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/${id}`, { headers: getAuthHeader() });
};

export default { getAllFornecedores, getFornecedorById, createFornecedor, updateFornecedor, deleteFornecedor };
