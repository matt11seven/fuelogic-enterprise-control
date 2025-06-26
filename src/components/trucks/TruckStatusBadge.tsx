import { Badge } from "@/components/ui/badge";
import { TruckStatus } from "@/types/truck";
import { CheckCircle, AlertCircle, WrenchIcon } from "lucide-react";

interface TruckStatusBadgeProps {
  status: TruckStatus;
}

const TruckStatusBadge = ({ status }: TruckStatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          label: 'Ativo',
          variant: 'success',
          icon: <CheckCircle className="w-3.5 h-3.5 mr-1" />,
          className: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
        };
      case 'inactive':
        return {
          label: 'Inativo',
          variant: 'secondary',
          icon: <AlertCircle className="w-3.5 h-3.5 mr-1" />,
          className: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        };
      case 'maintenance':
        return {
          label: 'Em Manutenção',
          variant: 'warning',
          icon: <WrenchIcon className="w-3.5 h-3.5 mr-1" />,
          className: 'bg-amber-500/20 text-amber-500 border-amber-500/30'
        };
      default:
        return {
          label: 'Desconhecido',
          variant: 'outline',
          icon: null,
          className: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant="outline" 
      className={`flex items-center px-2 py-1 ${config.className}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
};

export default TruckStatusBadge;
