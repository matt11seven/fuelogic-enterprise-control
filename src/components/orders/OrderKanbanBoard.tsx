import { ReactNode } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { OrderItem, OrderStatus } from "@/services/orders-api";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface OrderKanbanBoardProps {
  orders: OrderItem[];
  isLoading: boolean;
  onSelect: (order: OrderItem) => void;
  sophiaQuoteEnabled: boolean;
  onMoveOrder: (order: OrderItem, toStatus: OrderStatus) => Promise<void>;
  needAction?: ReactNode;
}

type KanbanColumnKey = "need" | "quote" | "decision" | "request" | "delivery";

interface KanbanColumn {
  key: KanbanColumnKey;
  title: string;
  statuses: OrderStatus[];
  moveTo: OrderStatus;
}

const COLUMNS: KanbanColumn[] = [
  { key: "need", title: "Necessidade", statuses: ["pending"], moveTo: "pending" },
  { key: "quote", title: "Cotacao", statuses: ["quoted"], moveTo: "quoted" },
  { key: "decision", title: "Decisao", statuses: ["approved"], moveTo: "approved" },
  { key: "request", title: "Pedido", statuses: ["delivering"], moveTo: "delivering" },
  { key: "delivery", title: "Entrega", statuses: ["delivered", "cancelled"], moveTo: "delivered" },
];

function getSubStatus(order: OrderItem, sophiaQuoteEnabled: boolean) {
  if (order.status === "pending") return { label: "Aguardando cotacao", tone: "amber" as const };
  if (order.status === "quoted") {
    if (sophiaQuoteEnabled && order.sophia_sent_at) return { label: "Sophia ativa", tone: "blue" as const };
    return { label: "Manual", tone: "slate" as const };
  }
  if (order.status === "approved") return { label: "Aprovado humano", tone: "emerald" as const };
  if (order.status === "delivering") {
    return order.delivery_estimate
      ? { label: "Com ETA", tone: "blue" as const }
      : { label: "Sem ETA", tone: "amber" as const };
  }
  if (order.status === "cancelled") return { label: "Cancelado", tone: "slate" as const };
  return { label: "Entregue", tone: "emerald" as const };
}

function subStatusClass(tone: "amber" | "blue" | "emerald" | "slate") {
  if (tone === "amber") return "bg-amber-100 text-amber-800 border-amber-200";
  if (tone === "blue") return "bg-blue-100 text-blue-800 border-blue-200";
  if (tone === "emerald") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function OrderKanbanBoard({
  orders,
  isLoading,
  onSelect,
  sophiaQuoteEnabled,
  onMoveOrder,
  needAction,
}: OrderKanbanBoardProps) {
  const ordersByColumn: Record<KanbanColumnKey, OrderItem[]> = {
    need: [],
    quote: [],
    decision: [],
    request: [],
    delivery: [],
  };

  for (const order of orders) {
    const column = COLUMNS.find((c) => c.statuses.includes(order.status));
    if (column) {
      ordersByColumn[column.key].push(order);
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const fromKey = result.source.droppableId as KanbanColumnKey;
    const toKey = result.destination.droppableId as KanbanColumnKey;
    if (fromKey === toKey) return;

    const moved = ordersByColumn[fromKey][result.source.index];
    if (!moved) return;

    const toColumn = COLUMNS.find((c) => c.key === toKey);
    if (!toColumn) return;

    await onMoveOrder(moved, toColumn.moveTo);
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Carregando board...</div>;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
        {COLUMNS.map((column) => {
          const columnOrders = ordersByColumn[column.key];
          const volume = columnOrders.reduce((acc, order) => acc + Number(order.quantity || 0), 0);

          return (
            <div key={column.key} className="rounded-lg border bg-white/80 p-2 min-h-[260px]">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wide">{column.title}</h3>
                  <p className="text-[11px] text-slate-500">
                    {columnOrders.length} item(ns) • {volume.toLocaleString("pt-BR")} L
                  </p>
                </div>
                {column.key === "need" && needAction ? <div className="shrink-0">{needAction}</div> : null}
              </div>

              <Droppable droppableId={column.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[180px] rounded-md p-1 ${snapshot.isDraggingOver ? "bg-emerald-50" : ""}`}
                  >
                    {columnOrders.length === 0 && (
                      <div className="rounded-md border border-dashed p-2 text-[11px] text-slate-400 text-center">Sem pedidos</div>
                    )}

                    {columnOrders.map((order, index) => {
                      const subStatus = getSubStatus(order, sophiaQuoteEnabled);
                      return (
                        <Draggable key={String(order.id)} draggableId={String(order.id)} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <button
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              type="button"
                              onClick={() => onSelect(order)}
                              className={`w-full text-left rounded-md border bg-white px-2 py-2 hover:border-emerald-300 transition-colors ${
                                dragSnapshot.isDragging ? "shadow-lg ring-1 ring-emerald-300" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-mono text-slate-500">#{order.id}</span>
                                <OrderStatusBadge status={order.status} />
                              </div>
                              <p className="text-xs font-semibold text-slate-900 leading-tight line-clamp-1">{order.station_name}</p>
                              <p className="text-[11px] text-slate-600 leading-tight line-clamp-1">{order.product_type}</p>
                              <div className="mt-1 flex items-center justify-between gap-1">
                                <p className="text-[11px] text-slate-600">{Number(order.quantity).toLocaleString("pt-BR")} L</p>
                                <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${subStatusClass(subStatus.tone)}`}>
                                  {subStatus.label}
                                </span>
                              </div>
                            </button>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
