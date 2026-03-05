import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calculator,
  ArrowRightLeft,
  ListChecks,
  RefreshCw,
  Star,
  X,
  TrendingUp,
  CalendarDays,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ordersApiService, {
  OrderItem,
  OrderStats,
  PurchaseDecisionSelection,
  QuotationAnalyticsResponse,
} from "@/services/orders-api";
import ConfigurationAPI from "@/services/configuration-api";
import { QuotationDecisionModal } from "@/components/orders/QuotationDecisionModal";
import { parseQuotationText } from "@/lib/quotation-text-parser";
import { getAllFornecedores, Fornecedor } from "@/services/suppliers-api";
import { getFuelColor } from "@/utils/fuelColors";
import { toast } from "@/hooks/use-toast";

interface NeedByProduct {
  product_type: string;
  station_count: number;
  total_volume: number;
}

interface QuotedGroupSummary {
  group_id: string;
  orders_count: number;
  stations: string[];
  products: string[];
  total_volume: number;
}

interface LocalQuotation {
  id: string;
  supplier_name: string;
  product_type: string;
  base_name: string;
  freight_cost_rl?: number | null;
  unit_price: number;
  freight_type: "FOB" | "CIF" | "";
  delivery_days: number;
}

interface MatrixCell extends LocalQuotation {
  custo_real: number;
}

interface DayTrendRow {
  supplier_name: string;
  product_type: string;
  base_name: string;
  freight_type: "FOB" | "CIF" | "";
  avg_price: number;
  yesterday_avg_price: number | null;
  avg_freight_cost_rl: number | null;
  avg_real_price: number;
  samples: number;
  delta_abs: number | null;
  delta_pct: number | null;
}

const emptyManual = {
  supplier_name: "",
  product_type: "",
  base_name: "Bagam",
  freight_cost_rl: "",
  unit_price: "",
  freight_type: "" as "FOB" | "CIF" | "",
  delivery_days: "",
};

const BASE_OPTIONS = [
  "Bagam",
  "Suape",
  "Cabedelo",
  "Pecem",
  "Mucuripe",
  "Aratu",
];

function calcCustoReal(unitPrice: number, freightType: "FOB" | "CIF" | "", freightCost: number): number {
  if (freightType === "FOB") return unitPrice + freightCost;
  return unitPrice;
}

function getFuelCodeFromProductType(productType: string): string {
  const p = String(productType || "").toUpperCase();
  if (p.includes("GASOLINA COMUM")) return "GC";
  if (p.includes("GASOLINA ADITIVADA")) return "GA";
  if (p.includes("GASOLINA PODIUM")) return "GP";
  if (p.includes("DIESEL S10")) return "S10";
  if (p.includes("DIESEL S500")) return "DS";
  if (p.includes("ETANOL")) return "ET";
  return p;
}

function getFuelAccentByProductType(productType: string) {
  const code = getFuelCodeFromProductType(productType);
  if (code === "GC") {
    return {
      badge: "bg-red-100 text-red-700",
      selected: "bg-red-100 text-red-700 border-red-300",
      unselected: "bg-white text-slate-700 dark:text-slate-300 border-slate-300 hover:border-red-300 hover:text-red-700",
    };
  }
  if (code === "GA") {
    return {
      badge: "bg-blue-100 text-blue-700",
      selected: "bg-blue-100 text-blue-700 border-blue-300",
      unselected: "bg-white text-slate-700 dark:text-slate-300 border-slate-300 hover:border-blue-300 hover:text-blue-700",
    };
  }
  if (code === "GP") {
    return {
      badge: "bg-purple-100 text-purple-700",
      selected: "bg-purple-100 text-purple-700 border-purple-300",
      unselected: "bg-white text-slate-700 dark:text-slate-300 border-slate-300 hover:border-purple-300 hover:text-purple-700",
    };
  }
  if (code === "S10" || code === "DS") {
    return {
      badge: "bg-orange-100 text-orange-700",
      selected: "bg-orange-100 text-orange-700 border-orange-300",
      unselected: "bg-white text-slate-700 dark:text-slate-300 border-slate-300 hover:border-orange-300 hover:text-orange-700",
    };
  }
  if (code === "ET") {
    return {
      badge: "bg-green-100 text-green-700",
      selected: "bg-green-100 text-green-700 border-green-300",
      unselected: "bg-white text-slate-700 dark:text-slate-300 border-slate-300 hover:border-green-300 hover:text-green-700",
    };
  }
  return {
    badge: "bg-emerald-100 text-emerald-700",
    selected: "bg-emerald-100 text-emerald-700 border-emerald-300",
    unselected: "bg-white text-slate-700 dark:text-slate-300 border-slate-300 hover:border-emerald-300 hover:text-emerald-700",
  };
}

const SUPPLIER_LOGO_BY_NAME: Record<string, string> = {
  petrobras: "/logos/suppliers/vibra-oficial.svg",
  "petrobras distribuidora": "/logos/suppliers/vibra-oficial.svg",
  "petrobras distribuidora sa": "/logos/suppliers/vibra-oficial.svg",
  "br distribuidora": "/logos/suppliers/vibra-oficial.svg",
  raizen: "/logos/suppliers/raizen-oficial.png",
  "raizen combustiveis": "/logos/suppliers/raizen-oficial.png",
  "raizen combustiveis sa": "/logos/suppliers/raizen-oficial.png",
  "raizen energia": "/logos/suppliers/raizen-oficial.png",
  ipiranga: "/logos/suppliers/ipiranga-oficial.png",
  "ipiranga produtos de petroleo": "/logos/suppliers/ipiranga-oficial.png",
  vibra: "/logos/suppliers/vibra-oficial.svg",
  "vibra energia": "/logos/suppliers/vibra-oficial.svg",
  "vibra energia sa": "/logos/suppliers/vibra-oficial.svg",
  alesat: "/logos/suppliers/ale-oficial.png",
  "alesat combustiveis": "/logos/suppliers/ale-oficial.png",
  ale: "/logos/suppliers/ale-oficial.png",
  "ale combustiveis": "/logos/suppliers/ale-oficial.png",
  alecombustiveis: "/logos/suppliers/ale-oficial.png",
  dislub: "/logos/suppliers/dislub-oficial.png",
  "dislub energia": "/logos/suppliers/dislub-oficial.png",
  larco: "/logos/suppliers/larco-oficial.png",
  "larco petroleo": "/logos/suppliers/larco-oficial.png",
  "larco distribuicao": "/logos/suppliers/larco-oficial.png",
  petronac: "/logos/suppliers/petronac-oficial.png",
  "petronac combustiveis": "/logos/suppliers/petronac-oficial.png",
  "petronac distribuidora": "/logos/suppliers/petronac-oficial.png",
  petrovia: "/logos/suppliers/petrovia-oficial.jpg",
  "petro via": "/logos/suppliers/petrovia-oficial.jpg",
  "setta combustiveis": "/logos/suppliers/setta.png",
  setta: "/logos/suppliers/setta.png",
  "setta distribuidora": "/logos/suppliers/setta.png",
};

function normalizeSupplierName(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function getSupplierLogo(name: string): string | null {
  const n = normalizeSupplierName(name);
  if (!n) return null;
  const entries = Object.entries(SUPPLIER_LOGO_BY_NAME).map(([key, logo]) => [normalizeSupplierName(key), logo] as const);
  const direct = entries.find(([key]) => key === n);
  if (direct) return direct[1];
  const partial = entries.find(([key]) => n.includes(key));
  return partial ? partial[1] : null;
}

function getSupplierInitials(name: string): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const Cotacoes = () => {
  const [pendingOrders, setPendingOrders] = useState<OrderItem[]>([]);
  const [quotedOrders, setQuotedOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [analytics, setAnalytics] = useState<QuotationAnalyticsResponse | null>(null);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sophiaQuoteEnabled, setSophiaQuoteEnabled] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);

  const [tab, setTab] = useState<"paste" | "manual" | "sophia">("paste");
  const [quotations, setQuotations] = useState<LocalQuotation[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<LocalQuotation[] | null>(null);
  const [manualForm, setManualForm] = useState(emptyManual);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [selectedDealByProduct, setSelectedDealByProduct] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pending, quoted, orderStats, config, allSuppliers, analyticsData] = await Promise.all([
        ordersApiService.getOrders({ status: "pending", limit: 500 }),
        ordersApiService.getOrders({ status: "quoted", limit: 500 }),
        ordersApiService.getStats(),
        ConfigurationAPI.getSophiaConfig().catch(() => ({ use_quote_assistant: false })),
        getAllFornecedores().catch(() => []),
        ordersApiService.getQuotationAnalytics().catch(() => null),
      ]);

      setPendingOrders(pending.orders || []);
      setQuotedOrders(quoted.orders || []);
      setStats(orderStats);
      setSophiaQuoteEnabled(!!config.use_quote_assistant);
      setFornecedores(allSuppliers);
      setAnalytics(analyticsData);
    } catch {
      toast({ title: "Erro ao carregar cotacoes", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const needsByProduct = useMemo<NeedByProduct[]>(() => {
    const map = new Map<string, { stations: Set<string>; volume: number }>();
    for (const order of pendingOrders) {
      const current = map.get(order.product_type) ?? { stations: new Set<string>(), volume: 0 };
      current.stations.add(order.station_id);
      current.volume += Number(order.quantity || 0);
      map.set(order.product_type, current);
    }
    return Array.from(map.entries())
      .map(([product_type, data]) => ({
        product_type,
        station_count: data.stations.size,
        total_volume: data.volume,
      }))
      .sort((a, b) => b.total_volume - a.total_volume);
  }, [pendingOrders]);

  const quotedGroups = useMemo<QuotedGroupSummary[]>(() => {
    const map = new Map<string, QuotedGroupSummary>();
    for (const order of quotedOrders) {
      const current = map.get(order.group_id) ?? {
        group_id: order.group_id,
        orders_count: 0,
        stations: [],
        products: [],
        total_volume: 0,
      };
      current.orders_count += 1;
      current.total_volume += Number(order.quantity || 0);
      if (!current.stations.includes(order.station_name)) current.stations.push(order.station_name);
      if (!current.products.includes(order.product_type)) current.products.push(order.product_type);
      map.set(order.group_id, current);
    }
    return Array.from(map.values()).sort((a, b) => b.total_volume - a.total_volume);
  }, [quotedOrders]);

  const totalPendingVolume = useMemo(
    () => pendingOrders.reduce((sum, o) => sum + Number(o.quantity || 0), 0),
    [pendingOrders],
  );

  const weeklyOverallAverage = useMemo(() => {
    if (!analytics || analytics.weekly_avg.length === 0) return 0;
    const weightedSum = analytics.weekly_avg.reduce(
      (acc, row) => acc + Number(row.avg_unit_price || 0) * Number(row.samples || 0),
      0,
    );
    const totalSamples = analytics.weekly_avg.reduce((acc, row) => acc + Number(row.samples || 0), 0);
    return totalSamples > 0 ? weightedSum / totalSamples : 0;
  }, [analytics]);

  const monthlyOverallAverage = useMemo(() => {
    if (!analytics || analytics.monthly_avg.length === 0) return 0;
    const weightedSum = analytics.monthly_avg.reduce(
      (acc, row) => acc + Number(row.avg_unit_price || 0) * Number(row.samples || 0),
      0,
    );
    const totalSamples = analytics.monthly_avg.reduce((acc, row) => acc + Number(row.samples || 0), 0);
    return totalSamples > 0 ? weightedSum / totalSamples : 0;
  }, [analytics]);

  const averageComparisonRows = useMemo(() => {
    if (!analytics) return [];
    const map = new Map<string, {
      supplier_name: string;
      product_type: string;
      weekly_avg: number | null;
      weekly_samples: number;
      monthly_avg: number | null;
      monthly_samples: number;
    }>();

    for (const row of analytics.weekly_avg) {
      const key = `${row.supplier_name}::${row.product_type}`;
      map.set(key, {
        supplier_name: row.supplier_name,
        product_type: row.product_type,
        weekly_avg: Number(row.avg_unit_price),
        weekly_samples: Number(row.samples || 0),
        monthly_avg: null,
        monthly_samples: 0,
      });
    }

    for (const row of analytics.monthly_avg) {
      const key = `${row.supplier_name}::${row.product_type}`;
      const existing = map.get(key);
      if (existing) {
        existing.monthly_avg = Number(row.avg_unit_price);
        existing.monthly_samples = Number(row.samples || 0);
      } else {
        map.set(key, {
          supplier_name: row.supplier_name,
          product_type: row.product_type,
          weekly_avg: null,
          weekly_samples: 0,
          monthly_avg: Number(row.avg_unit_price),
          monthly_samples: Number(row.samples || 0),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.product_type === b.product_type) return a.supplier_name.localeCompare(b.supplier_name);
      return a.product_type.localeCompare(b.product_type);
    });
  }, [analytics]);

  const supplierFreightCostMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of fornecedores) {
      const cost = Number(f.custo_frete_proprio_rl || 0);
      if (f.razao_social) map.set(f.razao_social.toLowerCase(), cost);
      if (f.nome_fantasia) map.set(f.nome_fantasia.toLowerCase(), cost);
    }
    return map;
  }, [fornecedores]);

  const todayTrendRows = useMemo<DayTrendRow[]>(() => {
    if (!analytics) return [];

    const aggregate = (rows: QuotationAnalyticsResponse["today_rows"]) => {
      const map = new Map<string, {
        supplier_name: string;
        product_type: string;
        base_name: string;
        freight_type: "FOB" | "CIF" | "";
        sum: number;
        sumReal: number;
        sumFreight: number;
        count: number;
      }>();

      for (const row of rows) {
        const freight = (row.freight_type || "") as "FOB" | "CIF" | "";
        const baseName = String(row.base_name || "Bagam");
        const key = `${row.supplier_name}::${row.product_type}::${baseName}::${freight}`;
        const quoteFreightCost = row.freight_type === "FOB" ? Number(row.freight_cost_rl ?? NaN) : 0;
        const supplierFreightCost = Number(supplierFreightCostMap.get(row.supplier_name.toLowerCase()) || 0);
        const freightCost = freight === "FOB"
          ? (Number.isFinite(quoteFreightCost) ? quoteFreightCost : supplierFreightCost)
          : 0;
        const real = Number(row.unit_price) + freightCost;
        const current = map.get(key) || {
          supplier_name: row.supplier_name,
          product_type: row.product_type,
          base_name: baseName,
          freight_type: freight,
          sum: 0,
          sumReal: 0,
          sumFreight: 0,
          count: 0,
        };
        current.sum += Number(row.unit_price);
        current.sumReal += real;
        current.sumFreight += freightCost;
        current.count += 1;
        map.set(key, current);
      }
      return map;
    };

    const todayMap = aggregate(analytics.today_rows || []);
    const yMap = aggregate(analytics.yesterday_rows || []);

    return Array.from(todayMap.values())
      .map((entry) => {
        const key = `${entry.supplier_name}::${entry.product_type}::${entry.base_name}::${entry.freight_type}`;
        const y = yMap.get(key);
        const avg = entry.count > 0 ? entry.sum / entry.count : 0;
        const avgReal = entry.count > 0 ? entry.sumReal / entry.count : 0;
        const avgFreight = entry.count > 0 ? entry.sumFreight / entry.count : 0;
        const yAvg = y && y.count > 0 ? y.sum / y.count : null;
        const deltaAbs = yAvg == null ? null : avg - yAvg;
        const deltaPct = yAvg == null || yAvg === 0 ? null : (deltaAbs! / yAvg) * 100;
        return {
          supplier_name: entry.supplier_name,
          product_type: entry.product_type,
          base_name: entry.base_name,
          freight_type: entry.freight_type,
          avg_price: avg,
          yesterday_avg_price: yAvg,
          avg_freight_cost_rl: entry.freight_type === "FOB" ? avgFreight : null,
          avg_real_price: avgReal,
          samples: entry.count,
          delta_abs: deltaAbs,
          delta_pct: deltaPct,
        };
      })
      .sort((a, b) => {
        if (a.product_type === b.product_type) return a.avg_real_price - b.avg_real_price;
        return a.product_type.localeCompare(b.product_type);
      });
  }, [analytics, supplierFreightCostMap]);

  const bestDealsByProduct = useMemo(() => {
    const map = new Map<string, DayTrendRow>();
    for (const row of todayTrendRows) {
      const current = map.get(row.product_type);
      if (!current || row.avg_real_price < current.avg_real_price) {
        map.set(row.product_type, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.product_type.localeCompare(b.product_type));
  }, [todayTrendRows]);

  const rowKeyOf = (row: DayTrendRow) =>
    `${row.supplier_name}::${row.product_type}::${row.base_name}::${row.freight_type}`;

  useEffect(() => {
    setSelectedDealByProduct((prev) => {
      const next = { ...prev };
      for (const best of bestDealsByProduct) {
        if (!next[best.product_type]) next[best.product_type] = rowKeyOf(best);
      }
      return next;
    });
  }, [bestDealsByProduct]);

  const productTypes = useMemo(() => needsByProduct.map((n) => n.product_type), [needsByProduct]);

  const matrixData = useMemo(() => {
    const supplierNames = [...new Set(quotations.map((q) => q.supplier_name))];
    return supplierNames.map((supplier) => {
      const supplierLower = supplier.toLowerCase();
      const fornecedor = fornecedores.find(
        (f) =>
          f.razao_social?.toLowerCase() === supplierLower ||
          f.nome_fantasia?.toLowerCase() === supplierLower,
      );
      const freightCost = Number(fornecedor?.custo_frete_proprio_rl ?? 0);

      const cells: (MatrixCell | null)[] = productTypes.map((product) => {
        const qs = quotations.filter(
          (q) => q.supplier_name === supplier && q.product_type === product,
        );
        if (qs.length === 0) return null;
        const best = qs.reduce((a, b) => (a.unit_price < b.unit_price ? a : b));
        const quoteFreightCost = Number(best.freight_cost_rl ?? NaN);
        const effectiveFreight = best.freight_type === "FOB"
          ? (Number.isFinite(quoteFreightCost) ? quoteFreightCost : freightCost)
          : 0;
        const custo_real = calcCustoReal(best.unit_price, best.freight_type, effectiveFreight);
        return { ...best, custo_real };
      });

      return { supplier_name: supplier, freightCost, cells };
    });
  }, [quotations, fornecedores, productTypes]);

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

  useEffect(() => {
    setSelections((prev) => {
      const next = { ...prev };
      for (const [product, best] of Object.entries(bestPerProduct)) {
        if (!next[product]) next[product] = best.supplier;
      }
      return next;
    });
  }, [bestPerProduct]);

  const totalEstimate = useMemo(() => {
    return needsByProduct.reduce((acc, need) => {
      const supplier = selections[need.product_type];
      if (!supplier) return acc;
      const row = matrixData.find((r) => r.supplier_name === supplier);
      const pi = productTypes.indexOf(need.product_type);
      const cell = row?.cells[pi];
      return acc + (cell ? cell.custo_real * need.total_volume : 0);
    }, 0);
  }, [selections, matrixData, needsByProduct, productTypes]);

  const allSelected = needsByProduct.every((n) => !!selections[n.product_type]);
  const hasQuotations = quotations.length > 0;

  const addQuotations = (qs: LocalQuotation[]) => setQuotations((prev) => [...prev, ...qs]);
  const removeQuotation = (id: string) => setQuotations((prev) => prev.filter((q) => q.id !== id));

  const applyDealForProduct = (deal: DayTrendRow) => {
    setQuotations((prev) => {
      const withoutProduct = prev.filter((q) => q.product_type !== deal.product_type);
      return [
        ...withoutProduct,
        {
          id: `best-${deal.product_type}-${deal.supplier_name}-${Date.now()}`,
          supplier_name: deal.supplier_name,
          product_type: deal.product_type,
          base_name: deal.base_name || "Bagam",
          freight_cost_rl: deal.avg_freight_cost_rl ?? null,
          unit_price: Number(deal.avg_price.toFixed(4)),
          freight_type: deal.freight_type,
          delivery_days: 0,
        },
      ];
    });
    setSelections((prev) => ({ ...prev, [deal.product_type]: deal.supplier_name }));
  };

  const applySelectedDeals = () => {
    if (todayTrendRows.length === 0) {
      toast({ title: "Sem cotacoes do dia", description: "Nao ha registros para aplicar na decisao." });
      return;
    }

    const bestByProductMap = new Map(bestDealsByProduct.map((d) => [d.product_type, d]));
    const selectedRows: DayTrendRow[] = [];

    for (const product of productTypes) {
      const chosenKey = selectedDealByProduct[product];
      const selected = todayTrendRows.find((row) => row.product_type === product && rowKeyOf(row) === chosenKey);
      if (selected) {
        selectedRows.push(selected);
        continue;
      }
      const best = bestByProductMap.get(product);
      if (best) selectedRows.push(best);
    }

    if (selectedRows.length === 0) {
      toast({ title: "Sem selecao valida", description: "Selecione ao menos uma opcao para aplicar." });
      return;
    }

    for (const deal of selectedRows) applyDealForProduct(deal);
    toast({
      title: "Selecao aplicada",
      description: "Opcoes escolhidas na listagem foram aplicadas na decisao de compra.",
    });
  };

  const handleInterpret = () => {
    const parsed = parseQuotationText(pasteText);
    setParsedPreview(
      parsed.map((q) => ({
        id: `${Date.now()}-${Math.random()}`,
        supplier_name: q.supplier_name,
        product_type: q.product_type,
        base_name: "Bagam",
        freight_cost_rl: null,
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
    const { supplier_name, product_type, base_name, freight_cost_rl, unit_price, freight_type, delivery_days } = manualForm;
    if (!supplier_name || !product_type || !unit_price) return;
    addQuotations([
      {
        id: `${Date.now()}-${Math.random()}`,
        supplier_name,
        product_type,
        base_name: base_name || "Bagam",
        freight_cost_rl: freight_type === "FOB" ? Number(freight_cost_rl || 0) : null,
        unit_price: Number(unit_price),
        freight_type,
        delivery_days: Number(delivery_days || 0),
      },
    ]);
    setManualForm(emptyManual);
  };

  const handleConfirm = async () => {
    if (!allSelected || !hasQuotations || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: PurchaseDecisionSelection[] = Object.entries(selections).map(
        ([product_type, supplier_name]) => {
          const selectedRowKey = selectedDealByProduct[product_type];
          const selectedRow = todayTrendRows.find(
            (row) => row.product_type === product_type && rowKeyOf(row) === selectedRowKey,
          );
          const row = matrixData.find((r) => r.supplier_name === supplier_name);
          const pi = productTypes.indexOf(product_type);
          const cell = row?.cells[pi];
          return {
            product_type,
            supplier_name: selectedRow?.supplier_name || supplier_name,
            base_name: selectedRow?.base_name || cell?.base_name || "Bagam",
            unit_price: selectedRow?.avg_price ?? cell?.unit_price ?? 0,
            freight_cost_rl: selectedRow?.avg_freight_cost_rl ?? cell?.freight_cost_rl ?? null,
            freight_type: selectedRow?.freight_type ?? cell?.freight_type ?? "",
            delivery_days: cell?.delivery_days ?? 0,
          };
        },
      );

      const result = await ordersApiService.purchaseDecision(payload);
      toast({
        title: "Compra decidida",
        description: `${result.groups_created} grupo(s) criado(s), ${result.orders_updated} pedido(s) movidos para cotacao.`,
      });

      setQuotations([]);
      setSelections({});
      setParsedPreview(null);
      setPasteText("");
      await loadData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao confirmar compra";
      toast({ title: "Erro ao confirmar compra", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Header />

        <div className="glass-card p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl shadow-lg">
                <Calculator className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-shadow">Cotacoes</h2>
                <p className="text-slate-800 dark:text-slate-200 text-sm font-medium">
                  Matriz consolidada para comparar fornecedores e decidir compra
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="gap-1.5">
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Link to="/pedidos">
                <Button variant="outline" size="sm">
                  Ir para Pedidos
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="glass-card p-4 border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-950/20 dark:to-transparent">
            <p className="text-xs text-slate-700 dark:text-slate-300">Pedidos pendentes</p>
            <p className="text-2xl font-semibold">{pendingOrders.length}</p>
          </div>
          <div className="glass-card p-4 border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-950/20 dark:to-transparent">
            <p className="text-xs text-slate-700 dark:text-slate-300">Volume pendente</p>
            <p className="text-2xl font-semibold">{totalPendingVolume.toLocaleString("pt-BR")} L</p>
          </div>
          <div className="glass-card p-4 border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-950/20 dark:to-transparent">
            <p className="text-xs text-slate-700 dark:text-slate-300">Grupos em cotacao</p>
            <p className="text-2xl font-semibold">{quotedGroups.length}</p>
          </div>
          <div className="glass-card p-4 border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-950/20 dark:to-transparent">
            <p className="text-xs text-slate-700 dark:text-slate-300">Sophia cotacao</p>
            <p className="text-2xl font-semibold">{sophiaQuoteEnabled ? "Ativa" : "Desligada"}</p>
          </div>
        </div>

        <section className="glass-card p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Historico de cotacoes
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-700 dark:text-slate-300">
                <CalendarDays className="w-3 h-3 inline mr-1" />
                Referencia: {analytics?.reference_date ? new Date(analytics.reference_date).toLocaleDateString("pt-BR") : "-"}
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={applySelectedDeals}>
                Aplicar selecionados na decisao
              </Button>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 overflow-hidden bg-white/70 dark:bg-slate-900/40">
            <div className="px-3 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100/40 dark:from-emerald-900/20 dark:to-transparent border-b border-slate-200 text-xs font-semibold">
              Hoje x Dia anterior
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 dark:bg-slate-800/40">
                    <th className="px-3 py-2 text-left">Fornecedor</th>
                    <th className="px-3 py-2 text-left">Combustivel</th>
                    <th className="px-3 py-2 text-left">Base</th>
                    <th className="px-3 py-2 text-center">Frete</th>
                    <th className="px-3 py-2 text-right">Frete base/L</th>
                    <th className="px-3 py-2 text-right">Hoje/L</th>
                    <th className="px-3 py-2 text-right">Ontem/L</th>
                    <th className="px-3 py-2 text-right">Real/L</th>
                    <th className="px-3 py-2 text-center">Tendencia</th>
                    <th className="px-3 py-2 text-center">Ranking</th>
                    <th className="px-3 py-2 text-center">Escolha</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTrendRows.map((row) => (
                    <tr key={`t-${row.supplier_name}-${row.product_type}-${row.freight_type}`} className="border-b border-slate-100/80 last:border-0 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10">
                      <td className="px-3 py-1.5">
                        <span className="inline-flex items-center gap-2">
                          {getSupplierLogo(row.supplier_name) ? (
                            <img
                              src={getSupplierLogo(row.supplier_name) || ""}
                              alt={row.supplier_name}
                              className="w-5 h-5 rounded-sm object-contain bg-white ring-1 ring-slate-200"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-200 text-[10px] font-semibold text-slate-700">
                              {getSupplierInitials(row.supplier_name)}
                            </span>
                          )}
                          <span>{row.supplier_name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${getFuelColor(
                              getFuelCodeFromProductType(row.product_type),
                            )}`}
                          />
                          <span>{row.product_type}</span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5">{row.base_name || "Bagam"}</td>
                      <td className="px-3 py-1.5 text-center">{row.freight_type || "-"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {row.freight_type === "FOB" && row.avg_freight_cost_rl != null
                          ? `R$ ${Number(row.avg_freight_cost_rl).toFixed(4)}`
                          : "-"}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">R$ {Number(row.avg_price).toFixed(4)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {row.yesterday_avg_price != null ? `R$ ${Number(row.yesterday_avg_price).toFixed(4)}` : "-"}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">R$ {Number(row.avg_real_price).toFixed(4)}</td>
                      <td className="px-3 py-1.5 text-center">
                        {row.delta_pct == null ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 dark:text-slate-300">
                            sem base
                          </span>
                        ) : row.delta_pct <= 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-700">
                            <ArrowDownRight className="w-3 h-3" />
                            {Math.abs(row.delta_pct).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] bg-red-100 text-red-700">
                            <ArrowUpRight className="w-3 h-3" />
                            {Math.abs(row.delta_pct).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {bestDealsByProduct.some((best) => rowKeyOf(best) === rowKeyOf(row)) ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              getFuelAccentByProductType(row.product_type).badge
                            }`}
                          >
                            melhor do dia
                          </span>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                          <button
                            type="button"
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border ${
                              selectedDealByProduct[row.product_type] === rowKeyOf(row)
                                ? getFuelAccentByProductType(row.product_type).selected
                                : getFuelAccentByProductType(row.product_type).unselected
                            }`}
                            onClick={() =>
                              setSelectedDealByProduct((prev) => ({
                              ...prev,
                              [row.product_type]: rowKeyOf(row),
                            }))
                          }
                        >
                          {selectedDealByProduct[row.product_type] === rowKeyOf(row) ? "selecionado" : "selecionar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {todayTrendRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-300" colSpan={11}>Sem cotacoes hoje.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-3 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 dark:from-emerald-900/20 dark:to-transparent">
              <p className="text-xs text-slate-700 dark:text-slate-300">Media ponderada da semana (7 dias)</p>
              <p className="text-lg font-semibold tabular-nums">
                {weeklyOverallAverage > 0 ? `R$ ${weeklyOverallAverage.toFixed(4)}/L` : "-"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 dark:from-emerald-900/20 dark:to-transparent">
              <p className="text-xs text-slate-700 dark:text-slate-300">Media ponderada do mes</p>
              <p className="text-lg font-semibold tabular-nums">
                {monthlyOverallAverage > 0 ? `R$ ${monthlyOverallAverage.toFixed(4)}/L` : "-"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 overflow-auto bg-white/70 dark:bg-slate-900/40">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Fornecedor</th>
                  <th className="px-3 py-2 text-left">Combustivel</th>
                  <th className="px-3 py-2 text-right">Media semana</th>
                  <th className="px-3 py-2 text-right">Media mes</th>
                </tr>
              </thead>
              <tbody>
                {averageComparisonRows.map((row) => (
                  <tr key={`${row.supplier_name}-${row.product_type}`} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-2">
                        {getSupplierLogo(row.supplier_name) ? (
                          <img
                            src={getSupplierLogo(row.supplier_name) || ""}
                            alt={row.supplier_name}
                            className="w-[18px] h-[18px] rounded-sm object-contain bg-white ring-1 ring-slate-200"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-slate-200 text-[9px] font-semibold text-slate-700">
                            {getSupplierInitials(row.supplier_name)}
                          </span>
                        )}
                        <span>{row.supplier_name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-1.5">{row.product_type}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {row.weekly_avg != null ? `R$ ${row.weekly_avg.toFixed(4)} (${row.weekly_samples})` : "-"}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {row.monthly_avg != null ? `R$ ${row.monthly_avg.toFixed(4)} (${row.monthly_samples})` : "-"}
                    </td>
                  </tr>
                ))}
                {averageComparisonRows.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-300" colSpan={4}>
                      Sem dados suficientes para medias semanal/mensal.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          <section className="glass-card p-5 space-y-4 border-emerald-200/50">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-sm uppercase tracking-wide">Necessidades pendentes</h3>
            </div>

            {needsByProduct.length === 0 ? (
              <p className="text-sm text-slate-700 dark:text-slate-300">Nenhum pedido pendente para cotacao.</p>
            ) : (
                  <div className="overflow-auto rounded-xl border border-slate-200 bg-white/70 dark:bg-slate-900/30">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200">
                      <th className="px-3 py-2 text-left">Combustivel</th>
                      <th className="px-3 py-2 text-right">Postos</th>
                      <th className="px-3 py-2 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {needsByProduct.map((item) => (
                      <tr key={item.product_type} className="border-b border-slate-100/80 last:border-0 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10">
                        <td className="px-3 py-2 font-medium">{item.product_type}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.station_count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {item.total_volume.toLocaleString("pt-BR")} L
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <hr className="border-slate-100" />

            <div className="space-y-3">
              <div className="inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-800/60 p-0.5 gap-0.5">
                {(["paste", "manual", "sophia"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                      tab === t
                        ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-700"
                    }`}
                  >
                    {t === "paste" ? "Colar texto" : t === "manual" ? "Manual" : "Sophia"}
                  </button>
                ))}
              </div>

              {tab === "paste" && (
                <div className="space-y-2">
                  <Textarea
                    placeholder={"Petrobras - Diesel S10 - R$ 5,38/L - CIF - 2 dias\nRaizen - Gasolina Comum - R$ 6,05/L - CIF - 1 dia"}
                    value={pasteText}
                    onChange={(e) => {
                      setPasteText(e.target.value);
                      setParsedPreview(null);
                    }}
                    className="min-h-[90px] font-mono text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={handleInterpret} disabled={!pasteText.trim()}>
                    Interpretar
                  </Button>

                  {parsedPreview && parsedPreview.length > 0 && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white/70 dark:bg-slate-900/40">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200">
                            <th className="py-2 px-3 text-left font-semibold">Fornecedor</th>
                            <th className="py-2 px-3 text-left font-semibold">Produto</th>
                            <th className="py-2 px-3 text-left font-semibold">Base</th>
                            <th className="py-2 px-3 text-right font-semibold">Preco/L</th>
                            <th className="py-2 px-3 text-center font-semibold">Frete</th>
                            <th className="py-2 px-3 text-center font-semibold">Prazo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedPreview.map((q) => (
                            <tr key={q.id} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <td className="py-1.5 px-3">
                                <span className="inline-flex items-center gap-2">
                                  {getSupplierLogo(q.supplier_name) ? (
                                    <img
                                      src={getSupplierLogo(q.supplier_name) || ""}
                                      alt={q.supplier_name}
                                      className="w-[18px] h-[18px] rounded-sm object-contain bg-white ring-1 ring-slate-200"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-slate-200 text-[9px] font-semibold text-slate-700">
                                      {getSupplierInitials(q.supplier_name)}
                                    </span>
                                  )}
                                  <span>{q.supplier_name}</span>
                                </span>
                              </td>
                              <td className="py-1.5 px-3">{q.product_type || "-"}</td>
                              <td className="py-1.5 px-3">{q.base_name || "Bagam"}</td>
                              <td className="py-1.5 px-3 text-right tabular-nums">R$ {q.unit_price.toFixed(4)}</td>
                              <td className="py-1.5 px-3 text-center">{q.freight_type || "-"}</td>
                              <td className="py-1.5 px-3 text-center">{q.delivery_days}d</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-3 py-2 flex justify-end bg-slate-50 border-t border-slate-200">
                        <Button size="sm" onClick={handleSavePasted}>
                          Salvar {parsedPreview.length} cotacao(oes)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "manual" && (
                <div className="grid grid-cols-2 sm:grid-cols-8 gap-2 items-end">
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
                          <SelectItem key={pt} value={pt}>
                            {pt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 col-span-1">
                    <Label className="text-xs">Base</Label>
                    <Select
                      value={manualForm.base_name}
                      onValueChange={(v) => setManualForm((p) => ({ ...p, base_name: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BASE_OPTIONS.map((base) => (
                          <SelectItem key={base} value={base}>
                            {base}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 col-span-1">
                    <Label className="text-xs">Preco/L</Label>
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
                    <Label className="text-xs">Frete base R$/L</Label>
                    <Input
                      type="number"
                      step={0.0001}
                      value={manualForm.freight_cost_rl}
                      onChange={(e) => setManualForm((p) => ({ ...p, freight_cost_rl: e.target.value }))}
                      placeholder="0.1200"
                      className="h-8 text-xs"
                      disabled={manualForm.freight_type !== "FOB"}
                    />
                  </div>
                  <div className="space-y-1 col-span-1">
                    <Label className="text-xs">Prazo</Label>
                    <Input
                      type="number"
                      min={0}
                      value={manualForm.delivery_days}
                      onChange={(e) => setManualForm((p) => ({ ...p, delivery_days: e.target.value }))}
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
                        !manualForm.base_name ||
                        !manualForm.unit_price ||
                        (manualForm.freight_type === "FOB" && !manualForm.freight_cost_rl)
                      }
                    >
                      Adicionar cotacao
                    </Button>
                  </div>
                </div>
              )}

              {tab === "sophia" && (
                <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-800 dark:text-slate-200">
                  {sophiaQuoteEnabled
                    ? "Sophia esta habilitada. Nesta tela, use colar texto ou manual para consolidar e decidir compra."
                    : "Sophia nao esta habilitada nesta conta."}
                </div>
              )}
            </div>

            {hasQuotations && (
              <>
                <hr className="border-slate-100" />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Matriz de decisao</p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/70 dark:bg-slate-900/40">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200">
                          <th className="py-2 px-3 text-left font-semibold sticky left-0 bg-slate-50/90 dark:bg-slate-800/60 min-w-[120px]">
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
                          <tr key={row.supplier_name} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-medium sticky left-0 bg-white/95 dark:bg-slate-900/80 whitespace-nowrap">
                              <span className="inline-flex items-center gap-2">
                                {getSupplierLogo(row.supplier_name) ? (
                                  <img
                                    src={getSupplierLogo(row.supplier_name) || ""}
                                    alt={row.supplier_name}
                                    className="w-[18px] h-[18px] rounded-sm object-contain bg-white ring-1 ring-slate-200"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-slate-200 text-[9px] font-semibold text-slate-700">
                                    {getSupplierInitials(row.supplier_name)}
                                  </span>
                                )}
                                <span>{row.supplier_name}</span>
                              </span>
                              {row.freightCost > 0 && (
                                <span className="block text-[9px] text-slate-600 dark:text-slate-300 font-normal">
                                  frete proprio R$ {row.freightCost.toFixed(4)}/L
                                </span>
                              )}
                            </td>
                            {productTypes.map((pt, pi) => {
                              const cell = row.cells[pi];
                              const best = bestPerProduct[pt];
                              const isBest = best?.supplier === row.supplier_name;
                              const isSelected = selections[pt] === row.supplier_name;
                              return (
                                <td key={pt} className={`py-2 px-3 text-center ${isBest ? "bg-emerald-50/80 dark:bg-emerald-900/20" : ""}`}>
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
                                      <span className="text-[9px] text-slate-600 dark:text-slate-300">
                                        {cell.base_name || "Bagam"} · {cell.freight_type || "-"}
                                        {cell.freight_type === "FOB" && cell.freight_cost_rl != null
                                          ? ` (${Number(cell.freight_cost_rl).toFixed(4)}/L)`
                                          : ""}
                                        {" · "}
                                        {cell.delivery_days}d
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
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-semibold text-slate-700">
                      Total geral: <span className="text-emerald-700">R$ {totalEstimate.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                    </span>
                    {!allSelected && (
                      <span className="text-xs text-emerald-600">Selecione um fornecedor para cada combustivel</span>
                    )}
                  </div>
                </div>
              </>
            )}

            {quotations.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-700 font-medium select-none">
                  Cotacoes coletadas ({quotations.length})
                </summary>
                <div className="mt-2 space-y-1 max-h-[140px] overflow-y-auto pr-1">
                  {quotations.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1"
                    >
                      <span className="truncate">
                        {q.supplier_name} - {q.product_type} - {q.base_name || "Bagam"} - R$ {q.unit_price.toFixed(4)}/L
                        {q.freight_type ? ` - ${q.freight_type}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeQuotation(q.id)}
                        className="text-slate-600 dark:text-slate-300 hover:text-red-500 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                onClick={handleConfirm}
                disabled={!allSelected || !hasQuotations || isSubmitting || needsByProduct.length === 0}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                {isSubmitting ? "Confirmando..." : "Confirmar compra"}
              </Button>
            </div>
          </section>

          <section className="glass-card p-5 border-emerald-200/50">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-sm uppercase tracking-wide">Grupos em cotacao</h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuotationModalOpen(true)}
                disabled={quotedOrders.length === 0}
              >
                Gerenciar cotacoes
              </Button>
            </div>

            {quotedGroups.length === 0 ? (
              <p className="text-sm text-slate-700 dark:text-slate-300">Nenhum grupo em status cotacao.</p>
            ) : (
              <div className="space-y-2 max-h-[760px] overflow-auto pr-1">
                {quotedGroups.map((group) => (
                  <div key={group.group_id} className="rounded-xl border border-slate-200 px-3 py-2 bg-gradient-to-br from-white/90 to-emerald-50/40 dark:from-slate-900/50 dark:to-emerald-900/10 hover:border-emerald-300 transition-colors">
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 mb-1">#{group.group_id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm font-medium text-slate-800">
                      {group.stations.length} posto(s) • {group.orders_count} pedido(s)
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1">{group.products.join(", ")}</p>
                    <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 tabular-nums">
                      {group.total_volume.toLocaleString("pt-BR")} L
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {stats && (
          <div className="mt-6 text-xs text-slate-700 dark:text-slate-300">
            Resumo global: {stats.pending} pendente(s), {stats.quoted} em cotacao, {stats.approved} aprovado(s).
          </div>
        )}
      </div>

      {quotationModalOpen && (
        <QuotationDecisionModal
          quotedOrders={quotedOrders}
          sophiaEnabled={sophiaQuoteEnabled}
          onClose={() => setQuotationModalOpen(false)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
};

export default Cotacoes;


