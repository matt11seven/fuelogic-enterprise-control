/**
 * Serviço de API para gerenciamento de contatos
 */
import axios from 'axios';

// Definindo a URL base da API de acordo com o ambiente - sem duplicar /api
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Removendo /api do BASE_URL se já estiver presente para evitar duplicação
const API_BASE_URL = BASE_URL.endsWith('/api') 
  ? `${BASE_URL}/contacts`
  : `${BASE_URL}/api/contacts`;

// Log para depuração
console.log('[DEBUG] API_BASE_URL para contatos:', API_BASE_URL);

/**
 * Obtém o cabeçalho de autenticação JWT
 */
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
  
  // Tentativa de fallback para 'jwt'
  const jwtToken = localStorage.getItem('jwt');
  if (jwtToken) {
    console.log('[INFO] Token JWT encontrado como "jwt" no localStorage');
    return { Authorization: `Bearer ${jwtToken}` };
  }
  
  console.warn('[AVISO] Nenhum token JWT encontrado no localStorage');
  return {};
};

/**
 * Interface para objeto de contato
 */
export interface Contact {
  id?: number;
  nome: string;
  telefone: string;
  documento?: string;
  email?: string;
  nome_auxiliar?: string;
  tipo: 'distribuidora' | 'fornecedor' | 'gerente' | 'supervisor' | 'proprietario' | 'manutencao';
  observacoes?: string;
  status: 'ativo' | 'inativo';
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

/**
 * Busca todos os contatos
 */
export const getAllContacts = async (): Promise<Contact[]> => {
  try {
    console.log('[DEBUG] Tentando obter contatos de:', API_BASE_URL);
    console.log('[DEBUG] Headers:', getAuthHeader());
    
    const response = await axios.get(API_BASE_URL, {
      headers: getAuthHeader()
    });
    
    console.log('[DEBUG] getAllContacts response:', response);
    
    // Garantir que a resposta seja sempre um array
    if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('[AVISO] A API retornou um formato inesperado para contatos:', response.data);
      return [];
    }
  } catch (error: any) {
    console.error('[ERRO] Erro ao buscar contatos:', error);
    if (error.response) {
      console.error('[ERRO] Status:', error.response.status);
      console.error('[ERRO] Data:', error.response.data);
      console.error('[ERRO] Headers:', error.response.headers);
    }
    return [];
  }
};

/**
 * Busca contatos por termo de pesquisa
 * @param term Termo de pesquisa
 */
export const searchContacts = async (term: string): Promise<Contact[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/search`, {
      params: { term },
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('[ERRO] Erro ao pesquisar contatos:', error);
    return [];
  }
};

/**
 * Filtra contatos por tipo
 * @param type Tipo de contato
 */
export const filterContactsByType = async (type: string): Promise<Contact[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/filter/${type}`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error('[ERRO] Erro ao filtrar contatos:', error);
    return [];
  }
};

/**
 * Busca um contato por ID
 * @param id ID do contato
 */
export const getContactById = async (id: number): Promise<Contact> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${id}`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error(`[ERRO] Erro ao buscar contato ${id}:`, error);
    throw error;
  }
};

/**
 * Cria um novo contato
 * @param contact Dados do contato
 */
export const createContact = async (contact: Contact): Promise<Contact> => {
  try {
    console.log('[DEBUG] Tentando criar contato com URL:', API_BASE_URL);
    console.log('[DEBUG] Dados do contato:', contact);
    console.log('[DEBUG] Headers:', getAuthHeader());
    
    const response = await axios.post(API_BASE_URL, contact, {
      headers: getAuthHeader()
    });
    
    console.log('[DEBUG] Resposta do cadastro de contato:', response);
    return response.data;
  } catch (error: any) {
    console.error('[ERRO] Erro ao criar contato:', error);
    if (error.response) {
      console.error('[ERRO] Status:', error.response.status);
      console.error('[ERRO] Data:', error.response.data);
      console.error('[ERRO] Headers:', error.response.headers);
    }
    throw error;
  }
};

/**
 * Atualiza um contato existente
 * @param id ID do contato
 * @param contact Dados do contato
 */
export const updateContact = async (id: number, contact: Contact): Promise<Contact> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${id}`, contact, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    console.error(`[ERRO] Erro ao atualizar contato ${id}:`, error);
    throw error;
  }
};

/**
 * Remove um contato (soft delete)
 * @param id ID do contato
 */
export const deleteContact = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/${id}`, {
      headers: getAuthHeader()
    });
  } catch (error) {
    console.error(`[ERRO] Erro ao remover contato ${id}:`, error);
    throw error;
  }
};

/**
 * Importa contatos a partir de arquivo CSV
 * @param file Arquivo CSV
 */
export const importContactsFromCSV = async (file: File): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_BASE_URL}/import`, formData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('[ERRO] Erro ao importar contatos:', error);
    throw error;
  }
};

/**
 * Exporta contatos para CSV
 */
export const exportContactsToCSV = async (): Promise<void> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/export`, {
      headers: getAuthHeader(),
      responseType: 'blob'
    });
    
    // Cria um objeto URL para o blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    
    // Cria um link temporário para download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'contatos.csv');
    
    // Adiciona o link ao DOM, simula o clique e remove
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  } catch (error) {
    console.error('[ERRO] Erro ao exportar contatos:', error);
    throw error;
  }
};

export default {
  getAllContacts,
  searchContacts,
  filterContactsByType,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  importContactsFromCSV,
  exportContactsToCSV
};
