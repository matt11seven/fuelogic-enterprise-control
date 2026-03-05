import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Star, CheckCircle2, X } from "lucide-react";
import { OrderItem, PurchaseDecisionSelection } from "@/services/orders-api";
import { parseQuotationText } from "@/lib/quotation-text-parser";
import { getAllFornecedores, Fornecedor } from "@/services/suppliers-api";
import ordersApiService from "@/services/orders-api";
import { toast } from "@/hooks/use-toast";

interface LocalQuotation {
  id: string;
  supplier_name: string;
  product_type: string;
  unit_price: number;
  freight_type: "FOB" | "CIF" | "";
  delivery_days: number;
}

interface MatrixCell extends LocalQuotation {
  custo_real: number;
}

function calcCustoReal(unitPrice: number, freightType: "FOB" | "CIF" | "", freightCost: number): number {
  if (freightType === "FOB") return unitPrice + freightCost;
  return unitPrice;
}

interface PurchaseDecisionModalProps {
  pendingOrders: OrderItem[];
  sophiaEnabled: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const emptyManual = {
  supplier_name: "",
  product_type: "",
  unit_price: "",
  freight_type: "" as "FOB" | "CIF" | "",
  delivery_days: "",
};

export function PurchaseDecisionModal({
  pendingOrders,
  sophiaEnabled,
  onClose,
  onUpdated,
}: PurchaseDecisionModalProps) {
  const [tab, setTab] = useState<"paste" | "manual" | "sophia">("paste");
  const [quotations, setQuotations] = useState<LocalQuotation[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<LocalQuotation[] | null>(null);
  const [manualForm, setManualForm] = useState(emptyManual);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getAllFornecedores().then(setFornecedores).catch(() => {});
  }, []);

  // Necessidades agrupadas por product_type
  const needsByProduct = useMemo(() => {
    const map = new Map<string, { stationIds: Set<string>; totalVolume: number }>();
    for (const order of pendingOrders) {
      const existing = map.get(order.product_type);
      if (existing) {
        existing.stationIds.add(order.station_id);
        existing.totalVolume += Number(order.quantity || 0);
      } else {
        map.set(order.product_type, {
          stationIds: new Set([order.station_id]),
          totalVolume: Number(order.quantity || 0),
        });
      }
    }
    return Array.from(map.entries()).map(([product_type, data]) => ({
      product_type,
      stationCount: data.stationIds.size,
      totalVolume: data.totalVolume,
    }));
  }, [pendingOrders]);

  const productTypes = useMemo(() => needsByProduct.map((n) => n.product_type), [needsByProduct]);

  // Matriz: linhas = fornecedores, colunas = combustíveis necessários
  const matrixData = useMemo(() => {
    const supplierNames = [...new Set(quotations.map((q) => q.supplier_name))];
    return supplierNames.map((supplier) => {
      const forn = fornecedores.find(
        (f) =>
          f.razao_social?.toLowerCase() === supplier.toLowerCase() ||
          f.nome_fantasia?.toLowerCase() === supplier.toLowerCase(),
      );
      const freightCost = Number(forn?.custo_frete_proprio_rl ?? 0);

      const cells: (MatrixCell | null)[] = productTypes.map((product) => {
        const qs = quotations.filter(
          (q) => q.supplier_name === supplier && q.product_type === product,
        );
        if (qs.length === 0) return null;
        const best = qs.reduce((a, b) => (a.unit_price < b.unit_price ? a : b));
        const custo_real = calcCustoReal(best.unit_price, best.freight_type, freightCost);
        return { ...best, custo_real };
      });

      return { supplier_name: supplier, freightCost, cells };
    });
  }, [quotations, fornecedores, productTypes]);

  // Melhor fornecedor (menor custo_real) por combustível
  const bestPerProduct = useMemo(() => {
    const result: Record<string, { supplier: string; cost: number }> = {};
    for (let pi = 0; pi < productTypes.length; pi++) {
      let best = { supplier: "", cost: Infinity };
      for (const row of matrixData) {
        const cell = row.cells[pi];
        if (cell && cell.custo_real < best.cost) {
          best = { supplier: row.supplier_name, cost: cell.custo_real };
        }
      }
      if (best.supplier) result[productTypes[pi]] = best;
    }
    return result;
  }, [matrixData, productTypes]);

  // Pré-selecionar automaticamente o melhor fornecedor por produto (sem sobrescrever seleção manual)
  useEffect(() => {
    setSelections((prev) => {
      const next = { ...prev };
      for (const [product, { supplier }] of Object.entries(bestPerProduct)) {
        if (!next[product]) next[product] = supplier;
      }
      return next;
    });
  }, [bestPerProduct]);

  // Total estimado da seleção atual
  const totalEstimate = useMemo(() => {
    return needsByProduct.reduce((acc, need) => {
      const supplier = selections[need.product_type];
      if (!supplier) return acc;
      const row = matrixData.find((r) => r.supplier_name === supplier);
      const pi = productTypes.indexOf(need.product_type);
      const cell = row?.cells[pi];
      return acc + (cell ? cell.custo_real * need.totalVolume : 0);
    }, 0);
  }, [selections, matrixData, needsByProduct, productTypes]);

  const allSelected = needsByProduct.every((n) => !!selections[n.product_type]);
  const hasQuotations = quotations.length > 0;

  const addQuotations = (qs: LocalQuotation[]) => setQuotations((prev) => [...prev, ...qs]);
  const removeQuotation = (id: string) => setQuotations((prev) => prev.filter((q) => q.id !== id));

  const handleInterpret = () => {
    const parsed = parseQuotationText(pasteText);
    setParsedPreview(
      parsed.map((q) => ({
        id: `${Date.now()}-${Math.random()}`,
        supplier_name: q.supplier_name,
        product_type: q.product_type,
        unit_price: q.unit_price,
        freight_type: q.freight_type,
        delivery_days: q.delivery_days,
      })),
    );
  };

  const handleSavePasted = () => {
    if (!parsedPreview) return;
    addQuotations(parsedPreview);
    setPasteText("");
    setParsedPreview(null);
  };

  const handleAddManual = () => {
    const { supplier_name, product_type, unit_price, freight_type, delivery_days } = manualForm;
    if (!supplier_name || !product_type || !unit_price) return;
    addQuotations([{
      id: `${Date.now()}-${Math.random()}`,
      supplier_name,
      product_type,
      unit_price: parseFloat(unit_price),
      freight_type,
      delivery_days: parseInt(delivery_days) || 0,
    }]);
    setManualForm(emptyManual);
  };

  const handleConfirm = async () => {
    if (!allSelected || !hasQuotations || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: PurchaseDecisionSelection[] = Object.entries(selections).map(
        ([product_type, supplier_name]) => {
          const row = matrixData.find((r) => r.supplier_name === supplier_name);
          const pi = productTypes.indexOf(product_type);
          const cell = row?.cells[pi];
          return {
            product_type,
            supplier_name,
            unit_price: cell?.unit_price ?? 0,
            freight_type: cell?.freight_type ?? "",
            delivery_days: cell?.delivery_days ?? 0,
          };
        },
      );

      const result = await ordersApiService.purchaseDecision(payload);
      toast({
        title: "Compra decidida!",
        description: `${result.groups_created} grupo(s) criado(s), ${result.orders_updated} pedido(s) movidos para Cotação.`,
      });
      onUpdated();
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao confirmar compra";
      toast({ title: "Erro ao confirmar compra", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            Decisão de Compra
          </DialogTitle>
        </DialogHeader>

        {/* Painel de necessidades */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Necessidades pendentes
          </p>
          <div className="flex flex-wrap gap-2">
            {needsByProduct.map((need) => (
              <div
                key={need.product_type}
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5"
              >
                <span className="text-xs font-semibold text-orange-700">{need.product_type}</span>
                <span className="text-xs text-orange-500">—</span>
                <span className="text-xs text-orange-600">
                  {need.stationCount} posto{need.stationCount > 1 ? "s" : ""}
                </span>
                <span className="text-xs text-orange-500">—</span>
                <span className="text-xs font-medium text-orange-700 tabular-nums">
                  {need.totalVolume.toLocaleString("pt-BR")} L
                </span>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Tabs de coleta de cotações */}
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 gap-0.5">
            {(["paste", "manual", "sophia"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                  tab === t
                    ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "paste" ? "Colar texto" : t === "manual" ? "Manual" : "Sophia"}
              </button>
            ))}
          </div>

          {tab === "paste" && (
            <div className="space-y-2">
              <Textarea
                placeholder={"Petrobras - Diesel S10 - R$ 5,38/L - CIF - 2 dias\nRaízen - Gasolina Comum - R$ 6,05/L - CIF - 1 dia"}
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setParsedPreview(null); }}
                className="min-h-[90px] font-mono text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleInterpret}
                disabled={!pasteText.trim()}
              >
                Interpretar
              </Button>

              {parsedPreview && parsedPreview.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-2 px-3 text-left font-semibold">Fornecedor</th>
                        <th className="py-2 px-3 text-left font-semibold">Produto</th>
                        <th className="py-2 px-3 text-right font-semibold">Preço/L</th>
                        <th className="py-2 px-3 text-center font-semibold">Frete</th>
                        <th className="py-2 px-3 text-center font-semibold">Prazo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPreview.map((q, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="py-1.5 px-3">{q.supplier_name}</td>
                          <td className="py-1.5 px-3">{q.product_type || "—"}</td>
                          <td className="py-1.5 px-3 text-right tabular-nums">
                            R$ {q.unit_price.toFixed(4)}
                          </td>
                          <td className="py-1.5 px-3 text-center">{q.freight_type || "—"}</td>
                          <td className="py-1.5 px-3 text-center">{q.delivery_days}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 flex justify-end bg-slate-50 border-t border-slate-200">
                    <Button size="sm" onClick={handleSavePasted}>
                      Salvar {parsedPreview.length} cotaç{parsedPreview.length > 1 ? "ões" : "ão"}
                    </Button>
                  </div>
                </div>
              )}
              {parsedPreview && parsedPreview.length === 0 && (
                <p className="text-xs text-slate-500">
                  Nenhuma cotação identificada. Verifique o formato.
                </p>
              )}
            </div>
          )}

          {tab === "manual" && (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
              <div className="space-y-1 col-span-2 sm:col-span-2">
                <Label className="text-xs">Fornecedor</Label>
                <Input
                  value={manualForm.supplier_name}
                  onChange={(e) => setManualForm((p) => ({ ...p, supplier_name: e.target.value }))}
                  placeholder="Nome"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label className="text-xs">Produto</Label>
                <Select
                  value={manualForm.product_type}
                  onValueChange={(v) => setManualForm((p) => ({ ...p, product_type: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((pt) => (
                      <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-1">
                <Label className="text-xs">Preço/L (R$)</Label>
                <Input
                  type="number"
                  step={0.0001}
                  value={manualForm.unit_price}
                  onChange={(e) => setManualForm((p) => ({ ...p, unit_price: e.target.value }))}
                  placeholder="5.38"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1 col-span-1">
                <Label className="text-xs">Frete</Label>
                <Select
                  value={manualForm.freight_type}
                  onValueChange={(v) =>
                    setManualForm((p) => ({ ...p, freight_type: v as "FOB" | "CIF" | "" }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIF">CIF</SelectItem>
                    <SelectItem value="FOB">FOB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-1">
                <Label className="text-xs">Prazo (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={manualForm.delivery_days}
                  onChange={(e) =>
                    setManualForm((p) => ({ ...p, delivery_days: e.target.value }))
                  }
                  placeholder="2"
                  className="h-8 text-xs"
                />
              </div>
              <div className="col-span-2 sm:col-span-6">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleAddManual}
                  disabled={
                    !manualForm.supplier_name ||
                    !manualForm.product_type ||
                    !manualForm.unit_price
                  }
                >
                  Adicionar cotação
                </Button>
              </div>
            </div>
          )}

          {tab === "sophia" && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              {sophiaEnabled ? (
                <>
                  <p className="text-sm font-medium text-slate-600">Sophia IA</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Para este fluxo, colete as cotações via WhatsApp (Colar texto) ou manualmente.
                    A integração automática da Sophia para decisão de compra será disponibilizada em breve.
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500">Sophia não está habilitada nesta conta.</p>
              )}
            </div>
          )}
        </div>

        {/* Matriz de decisão */}
        {hasQuotations && (
          <>
            <hr className="border-slate-100" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Matriz de decisão
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3 text-left font-semibold sticky left-0 bg-slate-50 min-w-[120px]">
                        Fornecedor
                      </th>
                      {productTypes.map((pt) => (
                        <th key={pt} className="py-2 px-3 text-center font-semibold whitespace-nowrap">
                          {pt}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.map((row) => (
                      <tr key={row.supplier_name} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 px-3 font-medium sticky left-0 bg-white whitespace-nowrap">
                          {row.supplier_name}
                          {row.freightCost > 0 && (
                            <span className="block text-[9px] text-slate-400 font-normal">
                              frete próprio R$ {row.freightCost.toFixed(4)}/L
                            </span>
                          )}
                        </td>
                        {productTypes.map((pt, pi) => {
                          const cell = row.cells[pi];
                          const best = bestPerProduct[pt];
                          const isBest = best?.supplier === row.supplier_name;
                          const isSelected = selections[pt] === row.supplier_name;
                          return (
                            <td
                              key={pt}
                              className={`py-2 px-3 text-center ${isBest ? "bg-emerald-50" : ""}`}
                            >
                              {cell ? (
                                <label className="flex flex-col items-center gap-1 cursor-pointer">
                                  <div className="flex items-center gap-0.5">
                                    {isBest && (
                                      <Star className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500" />
                                    )}
                                    <span
                                      className={`tabular-nums font-semibold ${
                                        isBest ? "text-emerald-700" : "text-slate-700"
                                      }`}
                                    >
                                      R$ {cell.custo_real.toFixed(4)}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-slate-400">
                                    {cell.freight_type || "—"} · {cell.delivery_days}d
                                  </span>
                                  <input
                                    type="radio"
                                    name={`select-${pt}`}
                                    checked={isSelected}
                                    onChange={() =>
                                      setSelections((p) => ({ ...p, [pt]: row.supplier_name }))
                                    }
                                    className="accent-emerald-600 mt-0.5"
                                  />
                                </label>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td className="py-2 px-3 font-semibold sticky left-0 bg-slate-50 text-xs">
                        Total estimado
                      </td>
                      {productTypes.map((pt) => {
                        const supplier = selections[pt];
                        const row = matrixData.find((r) => r.supplier_name === supplier);
                        const pi = productTypes.indexOf(pt);
                        const cell = row?.cells[pi];
                        const need = needsByProduct.find((n) => n.product_type === pt);
                        const subtotal = cell && need ? cell.custo_real * need.totalVolume : 0;
                        return (
                          <td key={pt} className="py-2 px-3 text-center font-medium tabular-nums text-xs">
                            {subtotal > 0
                              ? `R$ ${subtotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                              : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-slate-700">
                  Total geral:{" "}
                  <span className="text-emerald-700">
                    R$ {totalEstimate.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </span>
                </span>
                {!allSelected && (
                  <span className="text-xs text-orange-600">
                    Selecione um fornecedor para cada combustível
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Cotações coletadas (colapsável) */}
        {quotations.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium select-none">
              Cotações coletadas ({quotations.length})
            </summary>
            <div className="mt-2 space-y-1 max-h-[140px] overflow-y-auto pr-1">
              {quotations.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1"
                >
                  <span className="truncate">
                    {q.supplier_name} — {q.product_type} — R$ {q.unit_price.toFixed(4)}/L
                    {q.freight_type ? ` — ${q.freight_type}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuotation(q.id)}
                    className="text-slate-400 hover:text-red-500 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allSelected || !hasQuotations || isSubmitting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? "Confirmando..." : "Confirmar Compra"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
