import { useState, useMemo, useCallback, useEffect } from "react";
import { SendHorizonal, Truck as TruckIcon, Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ordersApiService, { GroupDetail, OrderItem } from "@/services/orders-api";
import { getAllTrucks } from "@/services/truck-api";
import { Truck } from "@/types/truck";
import { toast } from "@/hooks/use-toast";

interface OrderEmissionModalProps {
  approvedOrders: OrderItem[];
  onClose: () => void;
  onUpdated: () => void;
}

interface GroupSummary {
  group_id: string;
  orders: OrderItem[];
  stations: string[];
  products: string[];
  totalVolume: number;
}

export function OrderEmissionModal({
  approvedOrders,
  onClose,
  onUpdated,
}: OrderEmissionModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);

  const [form, setForm] = useState({
    chosen_supplier: "",
    truck_id: "",
    delivery_estimate: "",
    notes: "",
  });
  const [isEmitting, setIsEmitting] = useState(false);

  useEffect(() => {
    getAllTrucks()
      .then((data) => setTrucks(data.filter((t) => t.status === "active")))
      .catch(() => {/* silencioso */});
  }, []);

  const groups = useMemo<GroupSummary[]>(() => {
    const map = new Map<string, GroupSummary>();
    for (const order of approvedOrders) {
      const existing = map.get(order.group_id) ?? {
        group_id: order.group_id,
        orders: [],
        stations: [],
        products: [],
        totalVolume: 0,
      };
      existing.orders.push(order);
      if (!existing.stations.includes(order.station_name)) existing.stations.push(order.station_name);
      if (!existing.products.includes(order.product_type)) existing.products.push(order.product_type);
      existing.totalVolume += Number(order.quantity || 0);
      map.set(order.group_id, existing);
    }
    return Array.from(map.values());
  }, [approvedOrders]);

  const loadGroupDetail = useCallback(async (groupId: string) => {
    setIsLoadingDetail(true);
    setGroupDetail(null);
    try {
      const data = await ordersApiService.getGroupDetail(groupId);
      setGroupDetail(data);
      // Pre-fill chosen_supplier with the best-priced quotation
      if (data.quotations.length > 0) {
        const best = data.quotations.reduce((a, b) =>
          Number(a.unit_price) <= Number(b.unit_price) ? a : b,
        );
        setForm((f) => ({ ...f, chosen_supplier: best.supplier_name }));
      }
    } catch {
      toast({ title: "Erro ao carregar grupo", variant: "destructive" });
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setForm({ chosen_supplier: "", truck_id: "", delivery_estimate: "", notes: "" });
    loadGroupDetail(groupId);
  };

  const selectedGroup = groups.find((g) => g.group_id === selectedGroupId) ?? null;
  const totalVolume = groupDetail
    ? groupDetail.orders.reduce((acc, o) => acc + Number(o.quantity || 0), 0)
    : 0;
  const bestPrice = groupDetail && groupDetail.quotations.length > 0
    ? Math.min(...groupDetail.quotations.map((q) => Number(q.unit_price)))
    : null;

  const handleEmit = async () => {
    if (!selectedGroupId) return;
    if (!form.delivery_estimate) {
      toast({ title: "ETA obrigatório", description: "Defina a previsão de entrega para emitir o pedido.", variant: "destructive" });
      return;
    }
    setIsEmitting(true);
    try {
      const result = await ordersApiService.emitGroup(selectedGroupId, {
        chosen_supplier: form.chosen_supplier || undefined,
        truck_id: form.truck_id ? Number(form.truck_id) : undefined,
        delivery_estimate: form.delivery_estimate,
        notes: form.notes || undefined,
      });
      toast({
        title: "Pedido emitido",
        description: `${result.updated} pedido(s) movido(s) para Pedido`,
      });
      onUpdated();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao emitir pedido";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsEmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            Emissão de Pedido
            <span className="text-xs font-normal text-slate-500">
              — {groups.length} grupo(s) aprovado(s)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="w-52 shrink-0 border-r overflow-y-auto bg-slate-50/60">
            {groups.length === 0 ? (
              <p className="p-4 text-xs text-slate-400">Sem grupos aprovados</p>
            ) : (
              <ul className="py-2">
                {groups.map((g) => (
                  <li key={g.group_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectGroup(g.group_id)}
                      className={`w-full text-left px-3 py-3 text-xs transition-colors hover:bg-emerald-50 border-b ${
                        selectedGroupId === g.group_id
                          ? "bg-emerald-50 border-l-2 border-l-emerald-500"
                          : ""
                      }`}
                    >
                      <p className="font-semibold text-slate-800 truncate">
                        {g.stations.slice(0, 2).join(", ")}
                        {g.stations.length > 2 && ` +${g.stations.length - 2}`}
                      </p>
                      <p className="text-slate-500 truncate mt-0.5">
                        {g.products.join(" · ")}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-slate-500">
                          {g.totalVolume.toLocaleString("pt-BR")} L
                        </span>
                        <span className="inline-flex rounded-full bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5">
                          {g.orders.length}p
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right panel */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {!selectedGroupId ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                Selecione um grupo à esquerda
              </div>
            ) : isLoadingDetail ? (
              <div className="flex items-center justify-center h-48 gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando...
              </div>
            ) : groupDetail ? (
              <>
                {/* Group info */}
                <div className="text-xs text-slate-500 space-y-0.5">
                  <p><span className="font-medium text-slate-700">Postos:</span> {selectedGroup?.stations.join(", ")}</p>
                  <p><span className="font-medium text-slate-700">Volume total:</span> {totalVolume.toLocaleString("pt-BR")} L</p>
                </div>

                {/* Quotation summary */}
                {groupDetail.quotations.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cotações aprovadas
                    </p>
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium text-slate-500">Fornecedor</th>
                            <th className="px-2 py-1.5 text-right font-medium text-slate-500">Preço/L</th>
                            <th className="px-2 py-1.5 text-center font-medium text-slate-500">Prazo</th>
                            <th className="px-2 py-1.5 text-right font-medium text-slate-500">Total est.</th>
                            <th className="px-2 py-1.5 text-center font-medium text-slate-500">Escolher</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {groupDetail.quotations.map((q) => {
                            const isBest = Number(q.unit_price) === bestPrice;
                            const totalEst = Number(q.unit_price) * totalVolume;
                            const isSelected = form.chosen_supplier === q.supplier_name;
                            return (
                              <tr key={q.id} className={isBest ? "bg-emerald-50/60" : ""}>
                                <td className="px-2 py-1.5 font-medium text-slate-800">
                                  {isBest && <Star className="inline w-3 h-3 text-amber-400 fill-amber-400 mr-1" />}
                                  {q.supplier_name}
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono">
                                  R$ {Number(q.unit_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-2 py-1.5 text-center text-slate-500">
                                  {q.delivery_days ? `${q.delivery_days}d` : "-"}
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono text-slate-600">
                                  {totalEst > 0
                                    ? totalEst.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                                    : "-"}
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, chosen_supplier: q.supplier_name }))}
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                      isSelected
                                        ? "bg-emerald-500 text-white"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    }`}
                                  >
                                    {isSelected ? "✓" : "Selec."}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Emission form */}
                <div className="space-y-3 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Dados de emissão
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        Fornecedor escolhido
                      </label>
                      <Input
                        placeholder="Nome do fornecedor"
                        value={form.chosen_supplier}
                        onChange={(e) => setForm((f) => ({ ...f, chosen_supplier: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        <TruckIcon className="inline w-3 h-3 mr-1" />
                        Caminhão
                      </label>
                      <select
                        value={form.truck_id}
                        onChange={(e) => setForm((f) => ({ ...f, truck_id: e.target.value }))}
                        className="w-full h-8 text-xs border rounded-md px-2 bg-white"
                      >
                        <option value="">Sem caminhão vinculado</option>
                        {trucks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {t.driver_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        ETA (previsão de entrega) *
                      </label>
                      <Input
                        type="datetime-local"
                        value={form.delivery_estimate}
                        onChange={(e) => setForm((f) => ({ ...f, delivery_estimate: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        Observações
                      </label>
                      <Input
                        placeholder="Opcional"
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                      onClick={handleEmit}
                      disabled={isEmitting || !form.delivery_estimate}
                    >
                      {isEmitting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <SendHorizonal className="w-3 h-3" />
                      )}
                      Emitir Pedido
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
