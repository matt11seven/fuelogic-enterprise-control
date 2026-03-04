import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const API_BASE_URL = BASE_URL.endsWith("/api")
  ? `${BASE_URL}/sophia`
  : `${BASE_URL}/api/sophia`;

const getAuthHeader = () => {
  const storedUser = localStorage.getItem("fuelogic_user");
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user?.token) {
        return {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
        };
      }
    } catch (error) {
      console.error("Erro ao ler usuário do localStorage:", error);
    }
  }

  const token = localStorage.getItem("token");
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
  }

  return {
    headers: {
      "Content-Type": "application/json",
    },
  };
};

export interface SophiaSelectResponse {
  success: boolean;
  count: number;
  rows: unknown[];
}

export interface SophiaMessageRow {
  id: number;
  session_id: string;
  channel: string;
  direction: "in" | "out";
  role: string;
  message: string;
  provider?: string | null;
  model?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface SophiaSessionRow {
  session_id: string;
  last_message_at: string;
  total_messages: number;
  provider?: string | null;
  model?: string | null;
}

export interface SophiaInsertCotacaoInput {
  fornecedor_telefone: string;
  fornecedor_nome: string;
  base_nome: string;
  tipo_frete: string;
  combustivel: string;
  preco: number;
}

const sophiaOpsApi = {
  async getWorkflowSummary() {
    const response = await axios.get(`${API_BASE_URL}/workflow/summary`, getAuthHeader());
    return response.data;
  },

  async chatPassiva(message: string, sessionId?: string) {
    const response = await axios.post(
      `${API_BASE_URL}/chat/passiva`,
      { message, sessionId },
      getAuthHeader(),
    );
    return response.data;
  },

  async getObservabilitySessions(limit = 50) {
    const response = await axios.get<{ success: boolean; count: number; rows: SophiaSessionRow[] }>(
      `${API_BASE_URL}/observability/sessions`,
      {
        ...getAuthHeader(),
        params: { limit },
      },
    );
    return response.data;
  },

  async getObservabilityMessages(sessionId?: string, limit = 200) {
    const response = await axios.get<{ success: boolean; count: number; rows: SophiaMessageRow[] }>(
      `${API_BASE_URL}/observability/messages`,
      {
        ...getAuthHeader(),
        params: { sessionId, limit },
      },
    );
    return response.data;
  },

  async sendCobranca(number: string, context?: string, text?: string) {
    const response = await axios.post(
      `${API_BASE_URL}/cobranca/send`,
      { number, context, text },
      getAuthHeader(),
    );
    return response.data;
  },

  async processOrderBatch(payload: {
    group_id: string;
    timestamp: string;
    postos: unknown[];
    resumo: Record<string, number>;
    eventType?: string;
  }) {
    const response = await axios.post(
      `${API_BASE_URL}/orders/process`,
      payload,
      getAuthHeader(),
    );
    return response.data;
  },

  async selectEntity(entity: "bases" | "combustiveis" | "fornecedores" | "postos", q: string, limit = 20) {
    const response = await axios.get<SophiaSelectResponse>(
      `${API_BASE_URL}/select/${entity}`,
      {
        ...getAuthHeader(),
        params: { q, limit },
      },
    );
    return response.data;
  },

  async insertCotacao(payload: SophiaInsertCotacaoInput) {
    const response = await axios.post(
      `${API_BASE_URL}/insert/cotacao`,
      payload,
      getAuthHeader(),
    );
    return response.data;
  },

  async inboundWebhook(message: string, number: string, key?: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (key) headers["x-sophia-key"] = key;
    const response = await axios.post(
      `${API_BASE_URL}/webhook/sophia-gmtank`,
      { message, number },
      { headers },
    );
    return response.data;
  },
};

export default sophiaOpsApi;
