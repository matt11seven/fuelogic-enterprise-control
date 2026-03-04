import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const FILTER_TABS = [
  { value: "all",        label: "Todos" },
  { value: "pending",    label: "Pendente" },
  { value: "quoted",     label: "Em Cotação" },
  { value: "approved",   label: "Aprovado" },
  { value: "delivering", label: "Em Entrega" },
  { value: "delivered",  label: "Entregue" },
];

interface OrderFiltersProps {
  activeStatus: string;
  search: string;
  onStatusChange: (status: string) => void;
  onSearchChange: (value: string) => void;
}

export function OrderFilters({ activeStatus, search, onStatusChange, onSearchChange }: OrderFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onStatusChange(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
              activeStatus === tab.value
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "border-white/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por posto..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 w-56 filter-field text-sm"
        />
      </div>
    </div>
  );
}
