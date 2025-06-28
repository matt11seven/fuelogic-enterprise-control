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
    <Card className="glass-card-hover overflow-hidden transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <TruckIcon className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg">{truck.name}</CardTitle>
          </div>
          <TruckStatusBadge status={truck.status} />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <User className="h-4 w-4 mr-2 text-slate-400" />
            <span className="text-slate-300">{truck.driver_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 rounded text-xs font-mono shadow-sm">
                {truck.license_plate}
              </div>
              <span className="text-sm text-slate-400">
                {formatCapacity(truck.capacity)}
              </span>
            </div>
          </div>
          
          {isExpanded && truck.observations && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 mt-0.5 text-slate-400" />
                <p className="text-sm text-slate-300">{truck.observations}</p>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                <p>Criado em: {formatDate(truck.created_at)}</p>
                <p>Atualizado em: {formatDate(truck.updated_at)}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Menos detalhes" : "Mais detalhes"}
        </Button>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-emerald-500"
            onClick={() => onEdit(truck)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Editar</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-red-500"
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
