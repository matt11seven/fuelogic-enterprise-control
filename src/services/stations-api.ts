import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_BASE_URL = BASE_URL.endsWith('/api')
  ? `${BASE_URL}/postos`
  : `${BASE_URL}/api/postos`;

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

export interface Posto {
  id?: number;
  nome: string;
  nome_exibicao?: string;
  cliente_gm?: string;
  cnpj?: string;
  erp?: string;
  codigo_empresa_erp?: string;
  id_unidade?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  status: 'ativo' | 'inativo';
  created_at?: string;
  updated_at?: string;
}

const normalizePosto = (posto: Posto): Posto => {
  const nome = (posto.nome || '').trim();
  const nomeExibicao = (posto.nome_exibicao || '').trim();
  const clienteGm = (posto.cliente_gm || '').trim();
  const nomeResolvido = nome || nomeExibicao || clienteGm || posto.nome;
  return { ...posto, nome: nomeResolvido };
};

export const getAllPostos = async (params?: { q?: string; status?: string }): Promise<Posto[]> => {
  try {
    const response = await axios.get(API_BASE_URL, {
      params,
      headers: getAuthHeader()
    });
    return Array.isArray(response.data) ? response.data.map(normalizePosto) : [];
  } catch (error) {
    console.error('Erro ao buscar postos:', error);
    return [];
  }
};

export const getPostoById = async (id: number): Promise<Posto> => {
  const response = await axios.get(`${API_BASE_URL}/${id}`, { headers: getAuthHeader() });
  return normalizePosto(response.data);
};

export const createPosto = async (posto: Posto): Promise<Posto> => {
  const response = await axios.post(API_BASE_URL, posto, { headers: getAuthHeader() });
  return normalizePosto(response.data);
};

export const updatePosto = async (id: number, posto: Posto): Promise<Posto> => {
  const response = await axios.put(`${API_BASE_URL}/${id}`, posto, { headers: getAuthHeader() });
  return normalizePosto(response.data);
};

export const deletePosto = async (id: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/${id}`, { headers: getAuthHeader() });
};

export const getTanquesByPosto = async (postoId: number): Promise<any[]> => {
  const response = await axios.get(`${API_BASE_URL}/${postoId}/tanques`, { headers: getAuthHeader() });
  return response.data;
};

export default { getAllPostos, getPostoById, createPosto, updatePosto, deletePosto, getTanquesByPosto };
