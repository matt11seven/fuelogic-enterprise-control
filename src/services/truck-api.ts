import axios from 'axios';
import { Truck, TruckFormData } from '@/types/truck';

// Definindo a URL base da API de acordo com o ambiente - sem duplicar /api
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Removendo /api do BASE_URL se já estiver presente para evitar duplicação
const API_BASE_URL = BASE_URL.endsWith('/api') 
  ? `${BASE_URL}/trucks`
  : `${BASE_URL}/api/trucks`;

// Log para depuração
console.log('[DEBUG] API_BASE_URL para trucks:', API_BASE_URL);

// Função para obter o token JWT do localStorage
const getAuthHeader = () => {
  // Verificar primeiro se há um usuário armazenado no localStorage
  const storedUser = localStorage.getItem('fuelogic_user');
  
  if (storedUser) {
    try {
      // Tentar analisar o usuário armazenado
      const user = JSON.parse(storedUser);
      
      // Verificar se o token existe no objeto do usuário
      if (user && user.token) {
        console.log('[INFO] Token JWT encontrado no localStorage');
        return { Authorization: `Bearer ${user.token}` };
      }
    } catch (error) {
      console.error('[ERRO] Falha ao analisar usuário do localStorage:', error);
    }
  }
  
  // Verificar o token diretamente (fallback para compatibilidade)
  const token = localStorage.getItem('token');
  if (token) {
    console.log('[INFO] Token JWT encontrado diretamente no localStorage');
    return { Authorization: `Bearer ${token}` };
  }
  
  console.warn('[AVISO] Nenhum token JWT encontrado no localStorage');
  return {};
};

export const getAllTrucks = async (): Promise<Truck[]> => {
  const response = await axios.get(`${API_BASE_URL}`, {
    headers: getAuthHeader()
  });
  console.log('[DEBUG] getAllTrucks response:', response);
  return response.data;
};

export const getTruckById = async (id: number): Promise<Truck> => {
  const response = await axios.get(`${API_BASE_URL}/${id}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const createTruck = async (truckData: TruckFormData): Promise<Truck> => {
  console.log('[DEBUG] Tentando criar caminhão com URL:', API_BASE_URL);
  console.log('[DEBUG] Dados do caminhão:', truckData);
  console.log('[DEBUG] Headers:', getAuthHeader());
  
  try {
    const response = await axios.post(`${API_BASE_URL}`, truckData, {
      headers: getAuthHeader()
    });
    console.log('[DEBUG] Resposta do cadastro:', response);
    return response.data;
  } catch (error: any) {
    console.error('[ERRO] Detalhes do erro ao criar caminhão:', error);
    if (error.response) {
      console.error('[ERRO] Status:', error.response.status);
      console.error('[ERRO] Data:', error.response.data);
      console.error('[ERRO] Headers:', error.response.headers);
    }
    throw error;
  }
};

export const updateTruck = async (id: number, truckData: Partial<TruckFormData>): Promise<Truck> => {
  const response = await axios.put(`${API_BASE_URL}/${id}`, truckData, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const deleteTruck = async (id: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/${id}`, {
    headers: getAuthHeader()
  });
};

export const searchTrucks = async (query: string): Promise<Truck[]> => {
  const response = await axios.get(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeader()
  });
  return response.data;
};
