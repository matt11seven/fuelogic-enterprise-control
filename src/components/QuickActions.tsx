import { AlertCircle, Check, ChevronDown, MoreHorizontal, Truck } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface QuickActionsProps {
  tankId: string;
  stationId: string;
  tankCode: string;
  tankType: string;
  isLowLevel: boolean;
  hasWater: boolean;
  onRequestFill: (stationId: string, tankId: string) => void;
  onMarkInspection: (stationId: string, tankId: string) => void;
  onViewHistory: (stationId: string, tankId: string) => void;
}

export function QuickActions({
  tankId,
  stationId,
  tankCode,
  tankType,
  isLowLevel,
  hasWater,
  onRequestFill,
  onMarkInspection,
  onViewHistory,
}: QuickActionsProps) {
  return (
    <div className="flex items-center space-x-2">
      {/* Botão de ação rápida para solicitar abastecimento (visível quando nível baixo) */}
      {isLowLevel && (
        <Button
          variant="outline"
          size="sm"
          className="bg-red-900/20 border-red-500/30 text-red-400 hover:bg-red-900/30 hover:text-red-300"
          title="Solicitar abastecimento"
          onClick={() => onRequestFill(stationId, tankId)}
        >
          <Truck className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">Abastecer</span>
        </Button>
      )}

      {/* Botão de ação rápida para marcar inspeção (visível quando detectada água) */}
      {hasWater && (
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-900/20 border-blue-500/30 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300"
          title="Marcar inspeção"
          onClick={() => onMarkInspection(stationId, tankId)}
        >
          <AlertCircle className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">Inspecionar</span>
        </Button>
      )}

      {/* Menu de mais ações */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <span className="text-xs">Tanque {tankCode} - {tankType}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onViewHistory(stationId, tankId)}>
            <ChevronDown className="mr-2 h-4 w-4" />
            <span>Ver histórico</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMarkInspection(stationId, tankId)}>
            <Check className="mr-2 h-4 w-4" />
            <span>Marcar inspeção</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRequestFill(stationId, tankId)}>
            <Truck className="mr-2 h-4 w-4" />
            <span>Solicitar abastecimento</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default QuickActions;
