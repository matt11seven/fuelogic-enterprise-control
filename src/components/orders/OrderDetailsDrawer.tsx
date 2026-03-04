import { useEffect, useState } from "react";
import { X, CheckCircle, XCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderItem, OrderDetail, OrderStatus } from "@/services/orders-api";
import ordersApiService from "@/services/orders-api";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderTimeline } from "./OrderTimeline";
import { QuotationsPanel } from "./QuotationsPanel";
import { TruckAssignPanel } from "./TruckAssignPanel";
import { DeliveryEstimatePanel } from "./DeliveryEstimatePanel";
import { OrderNotesPanel } from "./OrderNotesPanel";
import { toast } from "@/hooks/use-toast";

interface OrderDetailsDrawerProps {
  order: OrderItem | null;
  onClose: () => void;
  onUpdated: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function OrderDetailsDrawer({ order, onClose, onUpdated }: OrderDetailsDrawerProps) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadDetail = async (id: number) => {
    setIsLoading(true);
    try {
      const data = await ordersApiService.getOrderById(id);
      setDetail(data);
    } catch {
      toast({ title: "Erro ao carregar detalhes", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setDetail(null);
    if (!order) return;
    loadDetail(order.id);
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (newStatus: OrderStatus, desc: string) => {
    if (!detail) return;
    setIsUpdatingStatus(true);
    try {
      await ordersApiService.updateStatus(detail.id, newStatus, desc);
      await loadDetail(detail.id);
      onUpdated();
      toast({ title: "Status atualizado" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Falha ao atualizar status";
      toast({ title: "Erro ao atualizar status", description: msg, variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddManualQuotation = async (payload: {
    supplier_name: string;
    product_type: string;
    unit_price: number;
    total_price: number;
    delivery_days: number;
    notes?: string;
  }) => {
    if (!detail?.group_id) {
      toast({ title: "Pedido sem grupo", variant: "destructive" });
      return;
    }
    try {
      await ordersApiService.addGroupQuotations(detail.group_id, [payload], "manual");
      await loadDetail(detail.id);
      onUpdated();
      toast({ title: "Cotacao manual registrada" });
    } catch {
      toast({ title: "Erro ao registrar cotacao manual", variant: "destructive" });
    }
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md h-full overflow-y-auto flex flex-col shadow-2xl bg-white dark:bg-slate-950 border-l border-emerald-100 dark:border-white/10">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-emerald-100 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100">Pedido #{order.id}</span>
              {detail && <OrderStatusBadge status={detail.status} />}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{order.station_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg glass-card-hover border border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
        ) : detail ? (
          <div className="flex-1 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Produto", value: detail.product_type },
                { label: "Volume", value: `${Number(detail.quantity).toLocaleString("pt-BR")} L`, mono: true },
                { label: "Criado em", value: new Date(detail.created_at).toLocaleString("pt-BR") },
                ...(detail.sophia_sent_at
                  ? [
                      {
                        label: "Enviado Sophia",
                        value: new Date(detail.sophia_sent_at).toLocaleString("pt-BR"),
                      },
                    ]
                  : []),
              ].map((item) => (
                <div key={item.label} className="glass-card px-3 py-2">
                  <p className="text-xs text-slate-500 dark:text-slate-500">{item.label}</p>
                  <p className={`text-sm font-medium text-slate-900 dark:text-slate-200 mt-0.5 ${item.mono ? "font-mono" : ""}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <Section title="Timeline">
              <OrderTimeline timeline={detail.timeline} />
            </Section>

            <Section title="Cotacoes">
              <QuotationsPanel
                quotations={detail.quotations}
                allowManual
                onAddManual={handleAddManualQuotation}
                productType={detail.product_type}
                quantity={Number(detail.quantity || 0)}
              />
            </Section>

            <Section title="Caminhao">
              {detail.truck_name && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Atual: {detail.truck_name} ({detail.license_plate})
                </p>
              )}
              <TruckAssignPanel
                orderId={detail.id}
                currentTruckId={detail.truck_id}
                currentTruckName={detail.truck_name}
                onAssigned={() => loadDetail(detail.id)}
              />
            </Section>

            <Section title="Previsao de Entrega">
              {detail.delivery_estimate && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Atual: {new Date(detail.delivery_estimate).toLocaleString("pt-BR")}
                </p>
              )}
              <DeliveryEstimatePanel
                orderId={detail.id}
                currentEstimate={detail.delivery_estimate}
                onUpdated={() => loadDetail(detail.id)}
              />
            </Section>

            <Section title="Notas">
              <OrderNotesPanel orderId={detail.id} notes={detail.notes} onUpdated={() => loadDetail(detail.id)} />
            </Section>

            {detail.status !== "cancelled" && detail.status !== "delivered" && (
              <div className="flex gap-2 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-400/40 text-red-500 hover:bg-red-500/10 hover:border-red-400"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange("cancelled", "Pedido cancelado pelo operador")}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Cancelar
                </Button>

                {detail.status === "quoted" && (
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChange("approved", "Pedido aprovado pelo operador")}
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Aprovar
                  </Button>
                )}

                {detail.status === "approved" && (
                  <Button
                    size="sm"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChange("delivering", "Pedido em rota de entrega")}
                  >
                    <Package className="w-4 h-4 mr-1.5" />
                    Em Entrega
                  </Button>
                )}

                {detail.status === "delivering" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChange("delivered", "Pedido entregue com sucesso")}
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Entregue
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
