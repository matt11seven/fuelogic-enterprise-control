import { useState, useMemo, useCallback } from "react";
import { Bot, Clipboard, Pen, Star, CheckCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ordersApiService, { GroupDetail, OrderItem, OrderQuotation } from "@/services/orders-api";
import sophiaOpsApi from "@/services/sophia-ops-api";
import { parseQuotationText, ParsedQuotation } from "@/lib/quotation-text-parser";
import { toast } from "@/hooks/use-toast";

interface QuotationDecisionModalProps {
  quotedOrders: OrderItem[];
  sophiaEnabled: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

type TabKey = "paste" | "manual" | "sophia";

interface GroupSummary {
  group_id: string;
  orders: OrderItem[];
  stations: string[];
  products: string[];
  totalVolume: number;
}

function extractFreight(notes: string | null): string {
  if (!notes) return "-";
  const m = notes.match(/^\[(CIF|FOB)\]/);
  return m ? m[1] : "-";
}

function cleanNotes(notes: string | null): string {
  if (!notes) return "";
  return notes.replace(/^\[(CIF|FOB)\]\s*/, "");
}

function ComparisonTable({
  quotations,
  totalVolume,
  onApprove,
  isApproving,
}: {
  quotations: OrderQuotation[];
  totalVolume: number;
  onApprove: () => void;
  isApproving: boolean;
}) {
  if (quotations.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-slate-400">
        Nenhuma cotação registrada ainda. Use as abas acima para adicionar.
      </div>
    );
  }

  const bestPrice = Math.min(...quotations.map((q) => Number(q.unit_price)));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="pb-2 text-left font-medium">Fornecedor</th>
              <th className="pb-2 text-left font-medium">Produto</th>
              <th className="pb-2 text-right font-medium">Preço/L</th>
              <th className="pb-2 text-center font-medium">Frete</th>
              <th className="pb-2 text-center font-medium">Prazo</th>
              <th className="pb-2 text-right font-medium">Total est.</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {quotations.map((q) => {
              const isBest = Number(q.unit_price) === bestPrice;
              const totalEst = Number(q.unit_price) * totalVolume;
              const freight = extractFreight(q.notes);
              return (
                <tr
                  key={q.id}
                  className={isBest ? "bg-emerald-50" : ""}
                >
                  <td className="py-2 pr-2 font-medium text-slate-800">
                    {isBest && <Star className="inline w-3 h-3 text-amber-400 mr-1 fill-amber-400" />}
                    {q.supplier_name}
                  </td>
                  <td className="py-2 pr-2 text-slate-600">{q.product_type}</td>
                  <td className="py-2 pr-2 text-right font-mono text-slate-800">
                    {Number(q.unit_price).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2 text-center">
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium border ${
                        freight === "CIF"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : freight === "FOB"
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {freight}
                    </span>
                  </td>
                  <td className="py-2 text-center text-slate-600">
                    {q.delivery_days ? `${q.delivery_days}d` : "-"}
                  </td>
                  <td className="py-2 text-right font-mono text-slate-800">
                    {totalEst > 0
                      ? totalEst.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          maximumFractionDigits: 0,
                        })
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end pt-2 border-t">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          onClick={onApprove}
          disabled={isApproving}
        >
          {isApproving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <CheckCircle className="w-3 h-3" />
          )}
          Aprovar grupo
        </Button>
      </div>
    </div>
  );
}

export function QuotationDecisionModal({
  quotedOrders,
  sophiaEnabled,
  onClose,
  onUpdated,
}: QuotationDecisionModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("paste");

  // Manual form
  const [manualForm, setManualForm] = useState({
    supplier_name: "",
    product_type: "",
    unit_price: "",
    freight_type: "CIF",
    delivery_days: "",
    notes: "",
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Paste tab
  const [pasteText, setPasteText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedQuotation[] | null>(null);
  const [isSavingParsed, setIsSavingParsed] = useState(false);

  // Sophia tab
  const [isSendingSophia, setIsSendingSophia] = useState(false);

  // Approve
  const [isApproving, setIsApproving] = useState(false);

  const groups = useMemo<GroupSummary[]>(() => {
    const map = new Map<string, GroupSummary>();
    for (const order of quotedOrders) {
      const existing = map.get(order.group_id) ?? {
        group_id: order.group_id,
        orders: [],
        stations: [],
        products: [],
        totalVolume: 0,
      };
      existing.orders.push(order);
      if (!existing.stations.includes(order.station_name)) {
        existing.stations.push(order.station_name);
      }
      if (!existing.products.includes(order.product_type)) {
        existing.products.push(order.product_type);
      }
      existing.totalVolume += Number(order.quantity || 0);
      map.set(order.group_id, existing);
    }
    return Array.from(map.values());
  }, [quotedOrders]);

  const loadGroupDetail = useCallback(async (groupId: string) => {
    setIsLoadingDetail(true);
    setGroupDetail(null);
    try {
      const data = await ordersApiService.getGroupDetail(groupId);
      setGroupDetail(data);
    } catch {
      toast({ title: "Erro ao carregar grupo", variant: "destructive" });
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setParsedPreview(null);
    setPasteText("");
    setManualForm({
      supplier_name: "",
      product_type: "",
      unit_price: "",
      freight_type: "CIF",
      delivery_days: "",
      notes: "",
    });
    loadGroupDetail(groupId);
  };

  const selectedGroup = groups.find((g) => g.group_id === selectedGroupId) ?? null;
  const totalVolume = groupDetail
    ? groupDetail.orders.reduce((acc, o) => acc + Number(o.quantity || 0), 0)
    : 0;

  // --- Sophia tab ---
  const sophiaSentAt = groupDetail?.orders[0]?.sophia_sent_at ?? null;

  const handleSendSophia = async () => {
    if (!selectedGroupId || !groupDetail) return;
    setIsSendingSophia(true);
    try {
      const postos = groupDetail.orders.map((o) => ({
        station_id: o.station_id,
        station_name: o.station_name,
        product_type: o.product_type,
        quantity: o.quantity,
      }));
      const resumo = groupDetail.orders.reduce<Record<string, number>>((acc, o) => {
        acc[o.product_type] = (acc[o.product_type] || 0) + Number(o.quantity);
        return acc;
      }, {});

      await sophiaOpsApi.processOrderBatch({
        group_id: selectedGroupId,
        timestamp: new Date().toISOString(),
        postos,
        resumo,
        eventType: "quote_request",
      });
      await ordersApiService.markGroupSophiaSent(selectedGroupId);
      await loadGroupDetail(selectedGroupId);
      toast({ title: "Sophia acionada com sucesso" });
    } catch {
      toast({ title: "Erro ao acionar Sophia", variant: "destructive" });
    } finally {
      setIsSendingSophia(false);
    }
  };

  // --- Manual tab ---
  const handleManualSubmit = async () => {
    if (!selectedGroupId || !groupDetail) return;
    if (!manualForm.supplier_name || !manualForm.unit_price) {
      toast({ title: "Fornecedor e Preço/L são obrigatórios", variant: "destructive" });
      return;
    }
    setIsSubmittingManual(true);
    try {
      const notes =
        manualForm.freight_type && manualForm.freight_type !== "N/A"
          ? `[${manualForm.freight_type}] ${manualForm.notes}`.trim()
          : manualForm.notes;

      const product =
        manualForm.product_type ||
        groupDetail.orders[0]?.product_type ||
        "";

      await ordersApiService.addGroupQuotations(selectedGroupId, [
        {
          supplier_name: manualForm.supplier_name,
          product_type: product,
          unit_price: parseFloat(manualForm.unit_price.replace(",", ".")) || 0,
          total_price: 0,
          delivery_days: parseInt(manualForm.delivery_days) || 0,
          notes: notes || null,
        },
      ]);
      toast({ title: "Cotação adicionada" });
      setManualForm({
        supplier_name: "",
        product_type: "",
        unit_price: "",
        freight_type: "CIF",
        delivery_days: "",
        notes: "",
      });
      await loadGroupDetail(selectedGroupId);
    } catch {
      toast({ title: "Erro ao salvar cotação", variant: "destructive" });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // --- Paste tab ---
  const handleParse = () => {
    if (!pasteText.trim()) return;
    const defaultProduct = groupDetail?.orders[0]?.product_type;
    const parsed = parseQuotationText(pasteText, defaultProduct);
    if (parsed.length === 0) {
      toast({ title: "Nenhuma cotação reconhecida", description: "Verifique o formato do texto", variant: "destructive" });
      return;
    }
    setParsedPreview(parsed);
  };

  const handleSaveParsed = async () => {
    if (!selectedGroupId || !parsedPreview || parsedPreview.length === 0) return;
    setIsSavingParsed(true);
    try {
      const defaultProduct = groupDetail?.orders[0]?.product_type ?? "";
      const toSave = parsedPreview.map((p) => ({
        supplier_name: p.supplier_name || "Desconhecido",
        product_type: p.product_type || defaultProduct,
        unit_price: p.unit_price,
        total_price: 0,
        delivery_days: p.delivery_days,
        notes: p.freight_type
          ? `[${p.freight_type}] ${p.notes}`.trim()
          : p.notes || null,
      }));
      await ordersApiService.addGroupQuotations(selectedGroupId, toSave);
      toast({ title: `${toSave.length} cotação(ões) salva(s)` });
      setParsedPreview(null);
      setPasteText("");
      await loadGroupDetail(selectedGroupId);
    } catch {
      toast({ title: "Erro ao salvar cotações", variant: "destructive" });
    } finally {
      setIsSavingParsed(false);
    }
  };

  // --- Approve ---
  const handleApprove = async () => {
    if (!selectedGroupId) return;
    setIsApproving(true);
    try {
      const result = await ordersApiService.approveGroup(selectedGroupId);
      toast({
        title: `Grupo aprovado`,
        description: `${result.updated} pedido(s) movido(s) para Decisão`,
      });
      onUpdated();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao aprovar grupo";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            Decisão de Compra
            <span className="text-xs font-normal text-slate-500">
              — {groups.length} grupo(s) em cotação
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: group list */}
          <div className="w-56 shrink-0 border-r overflow-y-auto bg-slate-50/60">
            {groups.length === 0 ? (
              <p className="p-4 text-xs text-slate-400">Sem grupos em cotação</p>
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
                          {g.orders.length} pedido(s)
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
                  <p>
                    <span className="font-medium text-slate-700">Postos:</span>{" "}
                    {selectedGroup?.stations.join(", ")}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Combustíveis:</span>{" "}
                    {selectedGroup?.products.join(", ")}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">Volume total:</span>{" "}
                    {totalVolume.toLocaleString("pt-BR")} L
                  </p>
                </div>

                {/* Tabs */}
                <div>
                  <div className="flex border-b mb-4">
                    {(["paste", "manual", "sophia"] as TabKey[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                          activeTab === tab
                            ? "border-emerald-500 text-emerald-700"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {tab === "paste" && <Clipboard className="w-3 h-3" />}
                        {tab === "manual" && <Pen className="w-3 h-3" />}
                        {tab === "sophia" && <Bot className="w-3 h-3" />}
                        {tab === "paste" && "Colar texto"}
                        {tab === "manual" && "Manual"}
                        {tab === "sophia" && "Sophia"}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Colar texto */}
                  {activeTab === "paste" && (
                    <div className="space-y-3">
                      <Textarea
                        rows={5}
                        value={pasteText}
                        onChange={(e) => {
                          setPasteText(e.target.value);
                          setParsedPreview(null);
                        }}
                        placeholder={`Cole o texto aqui. Exemplos:\nPetrobras - Diesel S10 - R$ 5,45/L - CIF - 3 dias\nBR Distribuidora - Gasolina - 5,89 - FOB - 5 dias\n\nOu formato bloco:\nFornecedor: Petrobras\nPreço: 5,45\nFrete: CIF\nPrazo: 3`}
                        className="text-xs font-mono resize-none"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleParse}
                        disabled={!pasteText.trim()}
                      >
                        Interpretar
                      </Button>

                      {parsedPreview && parsedPreview.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-700">
                            {parsedPreview.length} cotação(ões) reconhecida(s):
                          </p>
                          <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="px-2 py-1.5 text-left font-medium text-slate-500">Fornecedor</th>
                                  <th className="px-2 py-1.5 text-left font-medium text-slate-500">Produto</th>
                                  <th className="px-2 py-1.5 text-right font-medium text-slate-500">Preço/L</th>
                                  <th className="px-2 py-1.5 text-center font-medium text-slate-500">Frete</th>
                                  <th className="px-2 py-1.5 text-center font-medium text-slate-500">Prazo</th>
                                  <th className="px-2 py-1.5 text-center font-medium text-slate-500">Conf.</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {parsedPreview.map((p, i) => (
                                  <tr key={i}>
                                    <td className="px-2 py-1.5">{p.supplier_name || "-"}</td>
                                    <td className="px-2 py-1.5 text-slate-500">{p.product_type || "-"}</td>
                                    <td className="px-2 py-1.5 text-right font-mono">
                                      {p.unit_price > 0
                                        ? `R$ ${p.unit_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                                        : "-"}
                                    </td>
                                    <td className="px-2 py-1.5 text-center">{p.freight_type || "-"}</td>
                                    <td className="px-2 py-1.5 text-center">
                                      {p.delivery_days ? `${p.delivery_days}d` : "-"}
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                      <span
                                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] ${
                                          p.confidence === "high"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700"
                                        }`}
                                      >
                                        {p.confidence === "high" ? "OK" : "baixa"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleSaveParsed}
                            disabled={isSavingParsed}
                          >
                            {isSavingParsed ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            Salvar cotações
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: Manual */}
                  {activeTab === "manual" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-slate-600 block mb-1">
                            Fornecedor *
                          </label>
                          <Input
                            placeholder="Ex: Petrobras"
                            value={manualForm.supplier_name}
                            onChange={(e) =>
                              setManualForm((f) => ({ ...f, supplier_name: e.target.value }))
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">
                            Produto
                          </label>
                          <select
                            value={manualForm.product_type}
                            onChange={(e) =>
                              setManualForm((f) => ({ ...f, product_type: e.target.value }))
                            }
                            className="w-full h-8 text-xs border rounded-md px-2 bg-white"
                          >
                            <option value="">Todos do grupo</option>
                            {selectedGroup?.products.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">
                            Preço/L (R$) *
                          </label>
                          <Input
                            placeholder="Ex: 5,45"
                            value={manualForm.unit_price}
                            onChange={(e) =>
                              setManualForm((f) => ({ ...f, unit_price: e.target.value }))
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">
                            Frete
                          </label>
                          <select
                            value={manualForm.freight_type}
                            onChange={(e) =>
                              setManualForm((f) => ({ ...f, freight_type: e.target.value }))
                            }
                            className="w-full h-8 text-xs border rounded-md px-2 bg-white"
                          >
                            <option value="CIF">CIF</option>
                            <option value="FOB">FOB</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">
                            Prazo (dias)
                          </label>
                          <Input
                            placeholder="Ex: 3"
                            value={manualForm.delivery_days}
                            onChange={(e) =>
                              setManualForm((f) => ({ ...f, delivery_days: e.target.value }))
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-slate-600 block mb-1">
                            Observações
                          </label>
                          <Input
                            placeholder="Opcional"
                            value={manualForm.notes}
                            onChange={(e) =>
                              setManualForm((f) => ({ ...f, notes: e.target.value }))
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleManualSubmit}
                        disabled={isSubmittingManual}
                      >
                        {isSubmittingManual ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : null}
                        Adicionar cotação
                      </Button>
                    </div>
                  )}

                  {/* Tab: Sophia */}
                  {activeTab === "sophia" && (
                    <div className="space-y-3">
                      {!sophiaEnabled ? (
                        <p className="text-xs text-slate-500 bg-slate-50 rounded-md p-3 border">
                          A integração com Sophia não está habilitada. Ative nas configurações.
                        </p>
                      ) : sophiaSentAt ? (
                        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                          <Bot className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-blue-800">Sophia acionada</p>
                            <p className="text-xs text-blue-600 mt-0.5">
                              Enviado em{" "}
                              {new Date(sophiaSentAt).toLocaleString("pt-BR")}
                              . Aguardando resposta.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-600">
                            Sophia irá buscar cotações automaticamente junto aos fornecedores cadastrados.
                          </p>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                            onClick={handleSendSophia}
                            disabled={isSendingSophia}
                          >
                            {isSendingSophia ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Bot className="w-3 h-3" />
                            )}
                            Solicitar à Sophia
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Comparison table */}
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Comparativo de cotações
                    <span className="ml-2 font-normal text-slate-400">
                      ({groupDetail.quotations.length} cotação(ões))
                    </span>
                  </p>
                  <ComparisonTable
                    quotations={groupDetail.quotations}
                    totalVolume={totalVolume}
                    onApprove={handleApprove}
                    isApproving={isApproving}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
