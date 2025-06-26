import { useState, useEffect } from "react";
import { Truck, TruckStatus, TruckFilters } from "@/types/truck";
import TruckCard from "./TruckCard";
import TruckSearch from "./TruckSearch";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  CheckCircle, 
  WrenchIcon, 
  Filter, 
  Plus,
  RefreshCw,
  TruckIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TruckListProps {
  trucks: Truck[];
  isLoading: boolean;
  error: string | null;
  onEdit: (truck: Truck) => void;
  onDelete: (id: number) => void;
  onAddNew: () => void;
  onRefresh: () => void;
  onSearch: (query: string) => void;
}

const TruckList = ({
  trucks,
  isLoading,
  error,
  onEdit,
  onDelete,
  onAddNew,
  onRefresh,
  onSearch,
}: TruckListProps) => {
  const [filters, setFilters] = useState<TruckFilters>({
    status: 'all',
    search: '',
  });

  const [filteredTrucks, setFilteredTrucks] = useState<Truck[]>(trucks);

  // Aplicar filtros quando os caminhões ou filtros mudarem
  useEffect(() => {
    let result = [...trucks];

    // Filtrar por status
    if (filters.status && filters.status !== 'all') {
      result = result.filter(truck => truck.status === filters.status);
    }

    // Filtrar por termo de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        truck =>
          truck.name.toLowerCase().includes(searchLower) ||
          truck.driver_name.toLowerCase().includes(searchLower) ||
          truck.license_plate.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTrucks(result);
  }, [trucks, filters]);

  // Manipular a mudança de filtro de status
  const handleStatusFilter = (status: TruckStatus | 'all') => {
    setFilters(prev => ({ ...prev, status }));
  };

  // Manipular a busca
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query }));
    onSearch(query);
  };

  // Contar caminhões por status
  const countByStatus = (status: TruckStatus | 'all') => {
    // Verificação defensiva para garantir que trucks seja um array
    const trucksArray = Array.isArray(trucks) ? trucks : [];
    
    if (status === 'all') return trucksArray.length;
    return trucksArray.filter(truck => truck.status === status).length;
  };

  // Renderizar esqueletos durante o carregamento
  const renderSkeletons = () => {
    return Array(3)
      .fill(0)
      .map((_, index) => (
        <div key={`skeleton-${index}`} className="glass-card p-4">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <TruckIcon className="h-5 w-5 text-emerald-500" />
          <h2 className="text-xl font-semibold">Caminhões</h2>
          <Badge variant="outline" className="ml-2">
            {trucks.length} total
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <TruckSearch onSearch={handleSearch} />
          
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  {filters.status === 'all' ? 'Todos' : 
                   filters.status === 'active' ? 'Ativos' :
                   filters.status === 'inactive' ? 'Inativos' : 'Em Manutenção'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusFilter('all')}>
                  <span className="mr-2">Todos</span>
                  <Badge variant="outline">{countByStatus('all')}</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('active')}>
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
                  <span className="mr-2">Ativos</span>
                  <Badge variant="outline">{countByStatus('active')}</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('inactive')}>
                  <AlertCircle className="h-4 w-4 mr-2 text-slate-400" />
                  <span className="mr-2">Inativos</span>
                  <Badge variant="outline">{countByStatus('inactive')}</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('maintenance')}>
                  <WrenchIcon className="h-4 w-4 mr-2 text-amber-500" />
                  <span className="mr-2">Em Manutenção</span>
                  <Badge variant="outline">{countByStatus('maintenance')}</Badge>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="icon" variant="ghost" onClick={onRefresh} className="h-9 w-9">
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button onClick={onAddNew} size="sm" className="h-9">
              <Plus className="h-4 w-4 mr-2" />
              Novo Caminhão
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          renderSkeletons()
        ) : filteredTrucks.length > 0 ? (
          filteredTrucks.map(truck => (
            <TruckCard
              key={truck.id}
              truck={truck}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-slate-800/50 p-4 rounded-full mb-4">
              <TruckIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium">Nenhum caminhão encontrado</h3>
            <p className="text-slate-400 mt-1">
              {filters.status !== 'all' || filters.search
                ? "Tente ajustar os filtros ou termos de busca"
                : "Cadastre um novo caminhão para começar"}
            </p>
            {(filters.status !== 'all' || filters.search) && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setFilters({ status: 'all', search: '' })}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TruckList;
