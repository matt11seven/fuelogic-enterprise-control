import { useState, useMemo, ReactNode } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { FileText, SendHorizonal, Droplets, Layers, ShoppingCart } from "lucide-react";
import { OrderItem, OrderStatus } from "@/services/orders-api";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface OrderKanbanBoardProps {
  orders: OrderItem[];
  isLoading: boolean;
  onSelect: (order: OrderItem) => void;
  onSelectGroup?: (orders: OrderItem[]) => void;
  sophiaQuoteEnabled: boolean;
  onMoveOrder: (order: OrderItem, toStatus: OrderStatus) => Promise<void>;
  needAction?: ReactNode;
  onManageQuotations?: (quotedOrders: OrderItem[]) => void;
  onEmitOrders?: (approvedOrders: OrderItem[]) => void;
  onPurchaseDecision?: (pendingOrders: OrderItem[]) => void;
}

type KanbanColumnKey = "need" | "quote" | "decision" | "request" | "delivery" | "cancelled";

interface KanbanColumn {
  key: KanbanColumnKey;
  title: string;
  statuses: OrderStatus[];
  moveTo: OrderStatus;
}

interface OrderGroup {
  groupId: string;
  orders: OrderItem[];
}

const COLUMNS: KanbanColumn[] = [
  { key: "need",      title: "Necessidade", statuses: ["pending"],    moveTo: "pending"   },
  { key: "quote",     title: "Cotação",     statuses: ["quoted"],     moveTo: "quoted"    },
  { key: "decision",  title: "Decisão",     statuses: ["approved"],   moveTo: "approved"  },
  { key: "request",   title: "Pedido",      statuses: ["delivering"], moveTo: "delivering"},
  { key: "delivery",  title: "Entrega",     statuses: ["delivered"],  moveTo: "delivered" },
  { key: "cancelled", title: "Cancelado",   statuses: ["cancelled"],  moveTo: "cancelled" },
];

const COL_STYLE: Record<KanbanColumnKey, {
  accent: string;
  colBg: string;
  dragOver: string;
  cardBorder: string;
  cardHover: string;
  cardAccent: string;
  countBadge: string;
  actionBtn: string;
}> = {
  need: {
    accent:      "bg-orange-400",
    colBg:       "bg-slate-50/60",
    dragOver:    "bg-orange-50/70",
    cardBorder:  "border-slate-200",
    cardHover:   "hover:border-orange-300 hover:shadow-[0_2px_12px_rgba(251,146,60,0.15)]",
    cardAccent:  "border-l-orange-400",
    countBadge:  "bg-orange-50 text-orange-600 ring-1 ring-orange-200/80",
    actionBtn:   "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
  },
  quote: {
    accent:      "bg-violet-400",
    colBg:       "bg-slate-50/60",
    dragOver:    "bg-violet-50/70",
    cardBorder:  "border-slate-200",
    cardHover:   "hover:border-violet-300 hover:shadow-[0_2px_12px_rgba(167,139,250,0.15)]",
    cardAccent:  "border-l-violet-400",
    countBadge:  "bg-violet-50 text-violet-600 ring-1 ring-violet-200/80",
    actionBtn:   "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
  },
  decision: {
    accent:      "bg-emerald-400",
    colBg:       "bg-slate-50/60",
    dragOver:    "bg-emerald-50/70",
    cardBorder:  "border-slate-200",
    cardHover:   "hover:border-emerald-300 hover:shadow-[0_2px_12px_rgba(52,211,153,0.15)]",
    cardAccent:  "border-l-emerald-400",
    countBadge:  "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80",
    actionBtn:   "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  request: {
    accent:      "bg-blue-400",
    colBg:       "bg-slate-50/60",
    dragOver:    "bg-blue-50/70",
    cardBorder:  "border-slate-200",
    cardHover:   "hover:border-blue-300 hover:shadow-[0_2px_12px_rgba(96,165,250,0.15)]",
    cardAccent:  "border-l-blue-400",
    countBadge:  "bg-blue-50 text-blue-600 ring-1 ring-blue-200/80",
    actionBtn:   "",
  },
  delivery: {
    accent:      "bg-teal-400",
    colBg:       "bg-slate-50/60",
    dragOver:    "bg-teal-50/70",
    cardBorder:  "border-slate-200",
    cardHover:   "hover:border-teal-300 hover:shadow-[0_2px_12px_rgba(45,212,191,0.15)]",
    cardAccent:  "border-l-teal-400",
    countBadge:  "bg-teal-50 text-teal-600 ring-1 ring-teal-200/80",
    actionBtn:   "",
  },
  cancelled: {
    accent:      "bg-slate-300",
    colBg:       "bg-slate-50/40",
    dragOver:    "bg-slate-100/60",
    cardBorder:  "border-slate-200/70",
    cardHover:   "hover:border-slate-300",
    cardAccent:  "border-l-slate-300",
    countBadge:  "bg-slate-100 text-slate-500 ring-1 ring-slate-200/80",
    actionBtn:   "",
  },
};

function getSubStatus(order: OrderItem, sophiaQuoteEnabled: boolean) {
  if (order.status === "pending")
    return { label: "Aguardando cotação", cls: "bg-orange-50 text-orange-600 ring-1 ring-orange-200/60" };
  if (order.status === "quoted") {
    if (sophiaQuoteEnabled && order.sophia_sent_at)
      return { label: "Sophia ativa", cls: "bg-violet-50 text-violet-600 ring-1 ring-violet-200/60" };
    return { label: "Manual", cls: "bg-slate-100 text-slate-500 ring-1 ring-slate-200/60" };
  }
  if (order.status === "approved")
    return { label: "Aprovado", cls: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60" };
  if (order.status === "delivering")
    return order.delivery_estimate
      ? { label: "Com ETA", cls: "bg-blue-50 text-blue-600 ring-1 ring-blue-200/60" }
      : { label: "Sem ETA", cls: "bg-orange-50 text-orange-600 ring-1 ring-orange-200/60" };
  if (order.status === "cancelled")
    return { label: "Cancelado", cls: "bg-slate-100 text-slate-400 ring-1 ring-slate-200/60" };
  return { label: "Entregue", cls: "bg-teal-50 text-teal-600 ring-1 ring-teal-200/60" };
}

/** Agrupa lista de pedidos por group_id, preservando ordem de inserção */
function groupByGroupId(orders: OrderItem[]): OrderGroup[] {
  const map = new Map<string, OrderItem[]>();
  for (const order of orders) {
    const existing = map.get(order.group_id);
    if (existing) existing.push(order);
    else map.set(order.group_id, [order]);
  }
  return Array.from(map.entries()).map(([groupId, grpOrders]) => ({ groupId, orders: grpOrders }));
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-3 animate-pulse">
      <div className="flex items-center justify-between mb-2.5">
        <div className="h-2.5 w-10 rounded bg-slate-100" />
        <div className="h-4 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="h-3 w-3/4 rounded bg-slate-100 mb-1.5" />
      <div className="h-2.5 w-1/2 rounded bg-slate-100 mb-2.5" />
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-14 rounded bg-slate-100" />
        <div className="h-4 w-20 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

interface GroupCardProps {
  group: OrderGroup;
  index: number;
  onSelect: (order: OrderItem) => void;
  onSelectGroup?: (orders: OrderItem[]) => void;
}

function GroupCard({ group, index, onSelect, onSelectGroup }: GroupCardProps) {
  const { groupId, orders } = group;
  const style = COL_STYLE.need;

  const stations = [...new Set(orders.map((o) => o.station_name))];
  const products = [...new Set(orders.map((o) => o.product_type))];
  const totalVolume = orders.reduce((acc, o) => acc + Number(o.quantity || 0), 0);
  const isMultiStation = stations.length > 1;

  return (
    <Draggable draggableId={`group:${groupId}`} index={index}>
      {(dragProvided, dragSnapshot) => (
        <button
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          type="button"
          onClick={() => orders.length > 1 && onSelectGroup ? onSelectGroup(orders) : onSelect(orders[0])}
          className={[
            "w-full text-left rounded-lg border bg-white px-3 py-2.5 transition-all duration-150",
            "border-l-[3px]",
            style.cardBorder,
            style.cardAccent,
            style.cardHover,
            dragSnapshot.isDragging
              ? "shadow-xl ring-1 ring-black/10 scale-[1.02] rotate-[0.5deg] bg-white"
              : "shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
          ].join(" ")}
        >
          {/* Row 1: group ID + tanques badge */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[10px] font-mono text-slate-400 tracking-tight truncate">
              #{groupId.slice(-8).toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-0.5 shrink-0 rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold text-orange-600 ring-1 ring-orange-200/60">
              <Layers className="w-2.5 h-2.5" />
              {orders.length}t
            </span>
          </div>

          {/* Row 2: estações */}
          <p className="text-[12px] font-semibold text-slate-900 leading-snug line-clamp-1 mb-0.5">
            {isMultiStation ? `${stations.length} postos` : stations[0]}
          </p>

          {/* Row 3: produtos */}
          <p className="text-[11px] text-slate-500 leading-tight line-clamp-1 mb-2">
            {products.join(", ")}
          </p>

          {/* Row 4: volume total */}
          <div className="flex items-center gap-1">
            <Droplets className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-600 tabular-nums font-medium">
              {totalVolume.toLocaleString("pt-BR")} L
            </span>
          </div>
        </button>
      )}
    </Draggable>
  );
}

interface IndividualCardProps {
  order: OrderItem;
  index: number;
  onSelect: (order: OrderItem) => void;
  sophiaQuoteEnabled: boolean;
  isCancelled: boolean;
  style: typeof COL_STYLE[KanbanColumnKey];
}

function IndividualCard({ order, index, onSelect, sophiaQuoteEnabled, isCancelled, style }: IndividualCardProps) {
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
          className={[
            "w-full text-left rounded-lg border bg-white px-3 py-2.5 transition-all duration-150",
            "border-l-[3px]",
            style.cardBorder,
            style.cardAccent,
            style.cardHover,
            dragSnapshot.isDragging
              ? "shadow-xl ring-1 ring-black/10 scale-[1.02] rotate-[0.5deg] bg-white"
              : "shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
            isCancelled ? "opacity-55" : "",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[10px] font-mono text-slate-400 tracking-tight">
              #{String(order.id).padStart(4, "0")}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-[12px] font-semibold text-slate-900 leading-snug line-clamp-1 mb-0.5">
            {order.station_name}
          </p>
          <p className="text-[11px] text-slate-500 leading-tight line-clamp-1 mb-2">
            {order.product_type}
          </p>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <Droplets className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-[11px] text-slate-600 tabular-nums font-medium">
                {Number(order.quantity).toLocaleString("pt-BR")} L
              </span>
            </div>
            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${subStatus.cls}`}>
              {subStatus.label}
            </span>
          </div>
        </button>
      )}
    </Draggable>
  );
}

export function OrderKanbanBoard({
  orders,
  isLoading,
  onSelect,
  onSelectGroup,
  sophiaQuoteEnabled,
  onMoveOrder,
  needAction,
  onManageQuotations,
  onEmitOrders,
  onPurchaseDecision,
}: OrderKanbanBoardProps) {
  const [optimisticOrders, setOptimisticOrders] = useState<OrderItem[]>(orders);

  if (orders !== optimisticOrders && !isLoading) {
    setOptimisticOrders(orders);
  }

  const quoteGroupCount = useMemo(() => {
    const ids = new Set(optimisticOrders.filter((o) => o.status === "quoted").map((o) => o.group_id));
    return ids.size;
  }, [optimisticOrders]);

  const decisionGroupCount = useMemo(() => {
    const ids = new Set(optimisticOrders.filter((o) => o.status === "approved").map((o) => o.group_id));
    return ids.size;
  }, [optimisticOrders]);

  const ordersByColumn: Record<KanbanColumnKey, OrderItem[]> = {
    need: [], quote: [], decision: [], request: [], delivery: [], cancelled: [],
  };

  for (const order of optimisticOrders) {
    const column = COLUMNS.find((c) => c.statuses.includes(order.status));
    if (column) ordersByColumn[column.key].push(order);
  }

  // Grupos da coluna "Necessidade" — um card por solicitação
  const needGroups = useMemo(() => groupByGroupId(ordersByColumn.need), [ordersByColumn.need]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const fromKey = result.source.droppableId as KanbanColumnKey;
    const toKey = result.destination.droppableId as KanbanColumnKey;
    if (fromKey === toKey) return;

    const toColumn = COLUMNS.find((c) => c.key === toKey);
    if (!toColumn) return;

    const { draggableId } = result;

    if (draggableId.startsWith("group:")) {
      // Drag de grupo — move todos os pedidos do grupo
      const groupId = draggableId.slice(6);
      const groupOrders = ordersByColumn[fromKey].filter((o) => o.group_id === groupId);
      if (groupOrders.length === 0) return;

      const groupIds = groupOrders.map((o) => o.id);
      setOptimisticOrders((prev) =>
        prev.map((o) => (groupIds.includes(o.id) ? { ...o, status: toColumn.moveTo } : o)),
      );

      for (const order of groupOrders) {
        await onMoveOrder(order, toColumn.moveTo);
      }
    } else {
      // Drag individual (outras colunas)
      const moved = ordersByColumn[fromKey][result.source.index];
      if (!moved) return;

      setOptimisticOrders((prev) =>
        prev.map((o) => (o.id === moved.id ? { ...o, status: toColumn.moveTo } : o)),
      );
      await onMoveOrder(moved, toColumn.moveTo);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-2.5">
        {COLUMNS.map((column) => {
          const style = COL_STYLE[column.key];
          const columnOrders = ordersByColumn[column.key];
          const volume = columnOrders.reduce((acc, o) => acc + Number(o.quantity || 0), 0);
          const isCancelled = column.key === "cancelled";
          const isNeed = column.key === "need";

          // Badge de contagem: grupos para "need", pedidos para demais
          const badgeCount = isNeed ? needGroups.length : columnOrders.length;
          const isEmpty = isNeed ? needGroups.length === 0 : columnOrders.length === 0;

          return (
            <div
              key={column.key}
              className={`flex flex-col rounded-xl border border-slate-200/80 overflow-hidden ${style.colBg} ${isCancelled ? "opacity-80" : ""}`}
            >
              {/* Column accent bar */}
              <div className={`h-[3px] w-full ${style.accent} ${isCancelled ? "opacity-50" : ""}`} />

              {/* Column header */}
              <div className="px-3 pt-3 pb-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className={`text-[11px] font-semibold uppercase tracking-[0.06em] truncate ${isCancelled ? "text-slate-400" : "text-slate-600"}`}>
                      {column.title}
                    </h3>
                    {isLoading ? (
                      <div className="h-4 w-5 rounded-full bg-slate-100 animate-pulse shrink-0" />
                    ) : (
                      <span className={`inline-flex items-center justify-center min-w-[20px] h-4 px-1.5 rounded-full text-[10px] font-semibold tabular-nums shrink-0 ${style.countBadge}`}>
                        {badgeCount}
                      </span>
                    )}
                  </div>

                  {column.key === "quote" && onManageQuotations && quoteGroupCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => onManageQuotations(ordersByColumn.quote)}
                      className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${style.actionBtn}`}
                    >
                      <FileText className="w-3 h-3" />
                      {quoteGroupCount}g
                    </button>
                  ) : null}
                  {column.key === "decision" && onEmitOrders && decisionGroupCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => onEmitOrders(ordersByColumn.decision)}
                      className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${style.actionBtn}`}
                    >
                      <SendHorizonal className="w-3 h-3" />
                      {decisionGroupCount}g
                    </button>
                  ) : null}
                </div>

                {!isLoading && volume > 0 && (
                  <div className="flex items-center gap-1">
                    <Droplets className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {volume.toLocaleString("pt-BR")} L
                    </span>
                  </div>
                )}

                {column.key === "need" && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {onPurchaseDecision && ordersByColumn.need.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onPurchaseDecision(ordersByColumn.need)}
                        className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${style.actionBtn}`}
                      >
                        <ShoppingCart className="w-3 h-3" />
                        Decidir Compra
                      </button>
                    )}
                    {needAction}
                  </div>
                )}
              </div>

              {/* Droppable area */}
              <Droppable droppableId={column.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 px-2 pb-2 space-y-1.5 min-h-[200px] rounded-b-xl transition-colors duration-150 ${snapshot.isDraggingOver ? style.dragOver : ""}`}
                  >
                    {isLoading && (
                      <>
                        <SkeletonCard />
                        <SkeletonCard />
                      </>
                    )}

                    {!isLoading && isEmpty && (
                      <div className="flex flex-col items-center justify-center py-8 gap-1.5">
                        <div className={`w-6 h-6 rounded-full ${style.accent} opacity-15`} />
                        <span className="text-[10px] text-slate-400 font-medium">Sem pedidos</span>
                      </div>
                    )}

                    {/* Coluna "Necessidade": um card por grupo/solicitação */}
                    {!isLoading && isNeed && needGroups.map((group, index) => (
                      <GroupCard
                        key={group.groupId}
                        group={group}
                        index={index}
                        onSelect={onSelect}
                        onSelectGroup={onSelectGroup}
                      />
                    ))}

                    {/* Demais colunas: cards individuais */}
                    {!isLoading && !isNeed && columnOrders.map((order, index) => (
                      <IndividualCard
                        key={order.id}
                        order={order}
                        index={index}
                        onSelect={onSelect}
                        sophiaQuoteEnabled={sophiaQuoteEnabled}
                        isCancelled={isCancelled}
                        style={style}
                      />
                    ))}

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
