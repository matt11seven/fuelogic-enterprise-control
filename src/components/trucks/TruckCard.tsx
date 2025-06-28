
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck } from "@/types/truck";
import TruckStatusBadge from "./TruckStatusBadge";
import { Pencil, Trash2, TruckIcon, User, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TruckCardProps {
  truck: Truck;
  onEdit: (truck: Truck) => void;
  onDelete: (id: number) => void;
}

const TruckCard = ({ truck, onEdit, onDelete }: TruckCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCapacity = (capacity: number) => {
    return `${capacity.toLocaleString()} L`;
  };

  return (
    <Card className="truck-config-card overflow-hidden transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TruckIcon className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-semibold">{truck.name}</CardTitle>
          </div>
          <TruckStatusBadge status={truck.status} />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          <div className="flex items-center text-sm text-slate-600">
            <User className="h-4 w-4 mr-2 text-slate-400" />
            <span className="font-medium">{truck.driver_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold text-slate-700 border border-slate-200">
                {truck.license_plate}
              </div>
              <span className="text-sm text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md">
                {formatCapacity(truck.capacity)}
              </span>
            </div>
          </div>
          
          {isExpanded && truck.observations && (
            <div className="truck-details-expansion is-visible">
              <div className="flex items-start space-x-3">
                <FileText className="h-4 w-4 mt-1 text-emerald-500" />
                <div className="flex-1">
                  <p className="text-sm text-slate-700 leading-relaxed">{truck.observations}</p>
                  <div className="mt-3 pt-3 border-t border-emerald-100 text-xs text-slate-500 space-y-1">
                    <p><span className="font-medium">Criado:</span> {formatDate(truck.created_at)}</p>
                    <p><span className="font-medium">Atualizado:</span> {formatDate(truck.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-emerald-50/30 -mx-6 -mb-6 mt-4 px-6 py-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium"
        >
          {isExpanded ? "Menos detalhes" : "Mais detalhes"}
        </Button>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200"
            onClick={() => onEdit(truck)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Editar</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
            onClick={() => onDelete(truck.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Excluir</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TruckCard;

