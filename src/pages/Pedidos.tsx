import { useEffect, useState, useCallback } from "react";
import { Package, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { OrderMetricsBar } from "@/components/orders/OrderMetricsBar";
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderTable } from "@/components/orders/OrderTable";
import { OrderDetailsDrawer } from "@/components/orders/OrderDetailsDrawer";
import ordersApiService, { OrderItem, OrderStats } from "@/services/orders-api";
import { toast } from "@/hooks/use-toast";

const Pedidos = () => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

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
    const t = setTimeout(loadOrders, 300);
    return () => clearTimeout(t);
  }, [loadOrders]);

  const handleUpdated = () => { loadOrders(); loadStats(); };

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
            <div className="px-5 py-4 border-b border-white/10 dark:border-white/10 light:border-emerald-100/60 flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-slate-900 dark:text-slate-300">
                Lista de Pedidos
              </h3>
              <span className="text-xs text-slate-500">
                {isLoadingOrders ? "Carregando..." : `${orders.length} pedido(s)`}
              </span>
            </div>
            <OrderTable
              orders={orders}
              isLoading={isLoadingOrders}
              onSelect={setSelectedOrder}
            />
          </div>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
};

export default Pedidos;
