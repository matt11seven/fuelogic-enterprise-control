import { useEffect, useState, useCallback } from "react";
import { Package, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { OrderMetricsBar } from "@/components/orders/OrderMetricsBar";
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderTable } from "@/components/orders/OrderTable";
import { OrderKanbanBoard } from "@/components/orders/OrderKanbanBoard";
import { OrderDetailsDrawer } from "@/components/orders/OrderDetailsDrawer";
import { QuotationDecisionModal } from "@/components/orders/QuotationDecisionModal";
import { OrderEmissionModal } from "@/components/orders/OrderEmissionModal";
import { PurchaseDecisionModal } from "@/components/orders/PurchaseDecisionModal";
import { OrderGroupDrawer } from "@/components/orders/OrderGroupDrawer";
import PurchaseSuggestionModal from "@/components/PurchaseSuggestionModal";
import ordersApiService, { OrderItem, OrderStats } from "@/services/orders-api";
import ConfigurationAPI from "@/services/configuration-api";
import { useTankData } from "@/hooks/use-tank-data";
import { toast } from "@/hooks/use-toast";

const Pedidos = () => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [sophiaQuoteEnabled, setSophiaQuoteEnabled] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [quotedOrdersForModal, setQuotedOrdersForModal] = useState<OrderItem[]>([]);
  const [emissionModalOpen, setEmissionModalOpen] = useState(false);
  const [approvedOrdersForModal, setApprovedOrdersForModal] = useState<OrderItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<OrderItem[] | null>(null);
  const [purchaseDecisionOpen, setPurchaseDecisionOpen] = useState(false);
  const [pendingOrdersForDecision, setPendingOrdersForDecision] = useState<OrderItem[]>([]);
  const { data: stations } = useTankData();

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await ordersApiService.getStats();
      setStats(data);
    } catch {
      // silencioso
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const data = await ordersApiService.getOrders({
        status: activeStatus,
        search: search || undefined,
      });
      setOrders(data.orders);
    } catch {
      toast({ title: "Erro ao carregar pedidos", variant: "destructive" });
    } finally {
      setIsLoadingOrders(false);
    }
  }, [activeStatus, search]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    const loadSophiaToggle = async () => {
      try {
        const config = await ConfigurationAPI.getSophiaConfig();
        setSophiaQuoteEnabled(!!config.use_quote_assistant);
      } catch {
        setSophiaQuoteEnabled(false);
      }
    };
    loadSophiaToggle();
  }, []);

  useEffect(() => {
    const t = setTimeout(loadOrders, 300);
    return () => clearTimeout(t);
  }, [loadOrders]);

  const handleUpdated = () => { loadOrders(); loadStats(); };

  const handleManageQuotations = (quotedOrders: OrderItem[]) => {
    setQuotedOrdersForModal(quotedOrders);
    setQuotationModalOpen(true);
  };

  const handleSelectGroup = (groupOrders: OrderItem[]) => {
    setSelectedGroup(groupOrders);
  };

  const handlePurchaseDecision = (pendingOrders: OrderItem[]) => {
    setPendingOrdersForDecision(pendingOrders);
    setPurchaseDecisionOpen(true);
  };

  const handleEmitOrders = (approvedOrders: OrderItem[]) => {
    setApprovedOrdersForModal(approvedOrders);
    setEmissionModalOpen(true);
  };

  const handleMoveOrder = async (order: OrderItem, toStatus: OrderItem["status"]) => {
    if (order.status === toStatus) return;
    try {
      await ordersApiService.updateStatus(
        order.id,
        toStatus,
        `Movido no Kanban: ${order.status} -> ${toStatus}`,
      );
      await loadOrders();
      await loadStats();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Nao foi possivel mover o pedido";
      toast({ title: "Falha ao mover card", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Header />

        {/* Page title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl glow-emerald">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-shadow">Pedidos</h2>
              <p className="text-slate-900 dark:text-slate-400 text-sm font-medium">
                Gestão e acompanhamento de pedidos de combustível
              </p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          {/* Métricas */}
          <OrderMetricsBar stats={stats} isLoading={isLoadingStats} />

          {/* Filtros */}
          <div className="glass-card p-4">
            <OrderFilters
              activeStatus={activeStatus}
              search={search}
              onStatusChange={setActiveStatus}
              onSearchChange={setSearch}
            />
          </div>

          {/* Tabela */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="font-semibold text-[13px] text-slate-800 dark:text-slate-200">
                  {viewMode === "kanban" ? "Kanban de Pedidos" : "Lista de Pedidos"}
                </h3>
                {!isLoadingOrders && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-4 px-1.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold tabular-nums ring-1 ring-slate-200/80">
                    {orders.length}
                  </span>
                )}
              </div>
              {/* Segmented control — Vercel style */}
              <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 gap-0.5">
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                    viewMode === "kanban"
                      ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                    viewMode === "table"
                      ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Tabela
                </button>
              </div>
            </div>
            <div className="p-4">
              {viewMode === "kanban" ? (
                <OrderKanbanBoard
                  orders={orders}
                  isLoading={isLoadingOrders}
                  onSelect={setSelectedOrder}
                  onSelectGroup={handleSelectGroup}
                  sophiaQuoteEnabled={sophiaQuoteEnabled}
                  onMoveOrder={handleMoveOrder}
                  onManageQuotations={handleManageQuotations}
                  onEmitOrders={handleEmitOrders}
                  onPurchaseDecision={handlePurchaseDecision}
                  needAction={
                    <PurchaseSuggestionModal
                      stations={stations}
                      triggerLabel="Gerar Pedido"
                      triggerClassName="shrink-0 inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                    />
                  }
                />
              ) : (
                <OrderTable
                  orders={orders}
                  isLoading={isLoadingOrders}
                  onSelect={setSelectedOrder}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedGroup && (
        <OrderGroupDrawer
          orders={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onSelectOrder={(order) => {
            setSelectedGroup(null);
            setSelectedOrder(order);
          }}
        />
      )}

      {selectedOrder && (
        <OrderDetailsDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={handleUpdated}
        />
      )}

      {purchaseDecisionOpen && (
        <PurchaseDecisionModal
          pendingOrders={pendingOrdersForDecision}
          sophiaEnabled={sophiaQuoteEnabled}
          onClose={() => setPurchaseDecisionOpen(false)}
          onUpdated={handleUpdated}
        />
      )}

      {quotationModalOpen && (
        <QuotationDecisionModal
          quotedOrders={quotedOrdersForModal}
          sophiaEnabled={sophiaQuoteEnabled}
          onClose={() => setQuotationModalOpen(false)}
          onUpdated={handleUpdated}
        />
      )}

      {emissionModalOpen && (
        <OrderEmissionModal
          approvedOrders={approvedOrdersForModal}
          onClose={() => setEmissionModalOpen(false)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
};

export default Pedidos;
