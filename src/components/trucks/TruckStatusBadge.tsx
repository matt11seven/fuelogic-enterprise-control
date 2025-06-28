
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
          icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5" />,
          className: 'truck-status-badge status-active'
        };
      case 'inactive':
        return {
          label: 'Inativo',
          variant: 'secondary',
          icon: <AlertCircle className="w-3.5 h-3.5 mr-1.5" />,
          className: 'truck-status-badge status-inactive'
        };
      case 'maintenance':
        return {
          label: 'Em Manutenção',
          variant: 'warning',
          icon: <WrenchIcon className="w-3.5 h-3.5 mr-1.5" />,
          className: 'truck-status-badge status-maintenance'
        };
      default:
        return {
          label: 'Desconhecido',
          variant: 'outline',
          icon: null,
          className: 'truck-status-badge status-inactive'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant="outline" 
      className={`flex items-center px-3 py-1.5 text-xs font-semibold ${config.className}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
};

export default TruckStatusBadge;

