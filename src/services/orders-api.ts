import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const ORDERS_BASE_URL = BASE_URL.endsWith('/api')
  ? `${BASE_URL}/orders`
  : `${BASE_URL}/api/orders`;

const ordersApi = axios.create({
  baseURL: ORDERS_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

ordersApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export type OrderStatus = 'pending' | 'quoted' | 'approved' | 'delivering' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: number;
  user_id: number;
  group_id: string;
  station_id: string;
  station_name: string;
  tank_id: string;
  product_type: string;
  quantity: number;
  status: OrderStatus;
  truck_id: number | null;
  truck_name?: string;
  driver_name?: string;
  license_plate?: string;
  webhook_id: number | null;
  delivery_estimate: string | null;
  notes: string | null;
  sophia_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderTimeline {
  id: number;
  order_id: number;
  status: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface OrderQuotation {
  id: number;
  order_group_id: string;
  supplier_name: string;
  product_type: string;
  base_name?: string;
  freight_cost_rl?: number | null;
  unit_price: number;
  total_price: number;
  delivery_days: number;
  notes: string | null;
  created_at: string;
}

export interface ManualOrderQuotationInput {
  supplier_name: string;
  product_type: string;
  base_name?: string;
  freight_cost_rl?: number | null;
  unit_price: number;
  total_price: number;
  delivery_days: number;
  notes?: string | null;
}

export interface OrderDetail extends OrderItem {
  timeline: OrderTimeline[];
  quotations: OrderQuotation[];
}

export interface GroupDetail {
  group_id: string;
  orders: OrderItem[];
  quotations: OrderQuotation[];
}

export interface OrderStats {
  pending: number;
  quoted: number;
  approved: number;
  delivering: number;
  delivered: number;
  cancelled: number;
  total_volume: number;
}

export interface OrderFilters {
  status?: string;
  station_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BulkOrderInput {
  station_id: string;
  station_name: string;
  tank_id: string;
  product_type: string;
  quantity: number;
}

const getOrders = async (filters: OrderFilters = {}): Promise<{ orders: OrderItem[]; total: number; page: number; limit: number }> => {
  const response = await ordersApi.get('/', { params: filters });
  return response.data;
};

const getOrderById = async (id: number): Promise<OrderDetail> => {
  const response = await ordersApi.get(`/${id}`);
  return response.data;
};

const getStats = async (): Promise<OrderStats> => {
  const response = await ordersApi.get('/stats');
  return response.data;
};

const createBulkOrders = async (groupId: string, orders: BulkOrderInput[]): Promise<{ success: boolean; orders: OrderItem[]; group_id: string }> => {
  const response = await ordersApi.post('/bulk', { group_id: groupId, orders });
  return response.data;
};

const updateStatus = async (id: number, status: OrderStatus, description?: string): Promise<OrderItem> => {
  const response = await ordersApi.patch(`/${id}/status`, { status, description });
  return response.data;
};

const markSophiaSent = async (id: number): Promise<OrderItem> => {
  const response = await ordersApi.patch(`/${id}/sophia-sent`, {});
  return response.data;
};

const markGroupSophiaSent = async (
  groupId: string,
): Promise<{ success: boolean; group_id: string; updated: number }> => {
  const response = await ordersApi.patch(`/group/${groupId}/sophia-sent`, {});
  return response.data;
};

const assignTruck = async (id: number, truckId: number): Promise<OrderItem> => {
  const response = await ordersApi.patch(`/${id}/truck`, { truck_id: truckId });
  return response.data;
};

const setDeliveryEstimate = async (id: number, deliveryEstimate: string): Promise<OrderItem> => {
  const response = await ordersApi.patch(`/${id}/delivery-estimate`, { delivery_estimate: deliveryEstimate });
  return response.data;
};

const addNote = async (id: number, note: string): Promise<OrderItem> => {
  const response = await ordersApi.post(`/${id}/notes`, { note });
  return response.data;
};

const addGroupQuotations = async (
  groupId: string,
  quotations: ManualOrderQuotationInput[],
  source: 'manual' | 'sophia' = 'manual',
): Promise<{ success: boolean; quotations_saved: number }> => {
  const response = await ordersApi.post(`/group/${groupId}/quotations`, { quotations, source });
  return response.data;
};

export interface PurchaseDecisionSelection {
  product_type: string;
  supplier_name: string;
  base_name?: string;
  freight_cost_rl?: number | null;
  unit_price: number;
  freight_type: 'FOB' | 'CIF' | '';
  delivery_days: number;
}

export interface QuotationHistoryRow {
  id: number;
  order_group_id: string;
  supplier_name: string;
  product_type: string;
  base_name: string;
  freight_cost_rl?: number | null;
  unit_price: number;
  delivery_days: number;
  created_at: string;
  freight_type: 'FOB' | 'CIF' | '';
}

export interface QuotationAverageRow {
  supplier_name: string;
  product_type: string;
  avg_unit_price: number;
  samples: number;
}

export interface QuotationAnalyticsResponse {
  success: boolean;
  reference_date: string;
  today_rows: QuotationHistoryRow[];
  yesterday_rows: QuotationHistoryRow[];
  weekly_avg: QuotationAverageRow[];
  monthly_avg: QuotationAverageRow[];
}

export interface EmitGroupInput {
  chosen_supplier?: string;
  truck_id?: number | null;
  delivery_estimate: string;
  notes?: string;
}

const getGroupDetail = async (groupId: string): Promise<GroupDetail> => {
  const response = await ordersApi.get(`/group/${groupId}`);
  return response.data;
};

const approveGroup = async (groupId: string): Promise<{ success: boolean; updated: number; group_id: string }> => {
  const response = await ordersApi.patch(`/group/${groupId}/approve`, {});
  return response.data;
};

const emitGroup = async (groupId: string, input: EmitGroupInput): Promise<{ success: boolean; updated: number; group_id: string }> => {
  const response = await ordersApi.patch(`/group/${groupId}/emit`, input);
  return response.data;
};

const purchaseDecision = async (
  selections: PurchaseDecisionSelection[],
): Promise<{ success: boolean; groups_created: number; orders_updated: number }> => {
  const response = await ordersApi.post('/purchase-decision', { selections });
  return response.data;
};

const getQuotationAnalytics = async (refDate?: string): Promise<QuotationAnalyticsResponse> => {
  const response = await ordersApi.get('/quotations/analytics', {
    params: refDate ? { ref_date: refDate } : undefined,
  });
  return response.data;
};

const ordersApiService = {
  getOrders,
  getOrderById,
  getStats,
  createBulkOrders,
  updateStatus,
  markSophiaSent,
  markGroupSophiaSent,
  assignTruck,
  setDeliveryEstimate,
  addNote,
  addGroupQuotations,
  getGroupDetail,
  approveGroup,
  emitGroup,
  purchaseDecision,
  getQuotationAnalytics,
};

export default ordersApiService;
