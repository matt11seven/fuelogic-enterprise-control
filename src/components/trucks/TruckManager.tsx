import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Truck, TruckFormData } from "@/types/truck";
import TruckList from "./TruckList";
import { TruckRegistrationForm } from "./TruckRegistrationForm";
import { 
  getAllTrucks, 
  createTruck, 
  updateTruck, 
  deleteTruck, 
  searchTrucks 
} from "@/services/truck-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TruckManager = () => {
  const { toast } = useToast();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para o formulário
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<Truck | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  
  // Estados para o diálogo de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [truckToDelete, setTruckToDelete] = useState<number | null>(null);

  // Carregar caminhões ao montar o componente
  useEffect(() => {
    fetchTrucks();
  }, []);

  // Buscar todos os caminhões
  const fetchTrucks = async () => {
    setIsLoading(true);
    setError(null);
    
    // Verificar se o token JWT está disponível
    const storedUser = localStorage.getItem('fuelogic_user');
    console.log('[DEBUG] Usuário armazenado:', storedUser ? 'Encontrado' : 'Não encontrado');
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        console.log('[DEBUG] Token JWT disponível:', !!user.token);
      } catch (e) {
        console.error('[DEBUG] Erro ao analisar usuário:', e);
      }
    }
    
    try {
      console.log('[DEBUG] Iniciando chamada getAllTrucks...');
      const data = await getAllTrucks();
      console.log('[DEBUG] Resposta da API de caminhões:', data);
      
      // Verificação defensiva para garantir que data seja um array
      const trucksArray = Array.isArray(data) ? data : [];
      console.log('[DEBUG] Total de caminhões recebidos:', trucksArray.length);
      
      setTrucks(trucksArray);
    } catch (err: any) {
      const errorMessage = err.message || "Erro ao carregar caminhões";
      setError(errorMessage);
      
      // Log detalhado do erro
      console.error("[ERRO] Falha ao buscar caminhões:", err);
      if (err.response) {
        console.error('[ERRO] Detalhes da resposta:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
      } else if (err.request) {
        console.error('[ERRO] Requisição enviada mas sem resposta:', err.request);
      }
      
      // Em caso de erro, garantir que trucks seja um array vazio
      setTrucks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar caminhões por termo
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      fetchTrucks();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await searchTrucks(query);
      // Verificação defensiva para garantir que data seja um array
      setTrucks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Erro na busca");
      console.error("Erro ao buscar caminhões:", err);
      // Em caso de erro, garantir que trucks seja um array vazio
      setTrucks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Abrir formulário para adicionar novo caminhão
  const handleAddNew = () => {
    setSelectedTruck(undefined);
    setFormError(undefined);
    setFormOpen(true);
  };

  // Abrir formulário para editar caminhão existente
  const handleEdit = (truck: Truck) => {
    setSelectedTruck(truck);
    setFormError(undefined);
    setFormOpen(true);
  };

  // Confirmar exclusão de caminhão
  const handleDeleteConfirm = (id: number) => {
    setTruckToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Executar exclusão de caminhão
  const executeDelete = async () => {
    if (truckToDelete === null) return;
    
    try {
      await deleteTruck(truckToDelete);
      setTrucks(trucks.filter(truck => truck.id !== truckToDelete));
      toast({
        title: "Caminhão excluído",
        description: "O caminhão foi removido com sucesso.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: err.message || "Não foi possível excluir o caminhão.",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTruckToDelete(null);
    }
  };

  // Enviar formulário (criar ou atualizar)
  const handleFormSubmit = async (data: TruckFormData) => {
    setIsSubmitting(true);
    setFormError(undefined);
    
    try {
      if (selectedTruck) {
        // Atualizar caminhão existente
        const updated = await updateTruck(selectedTruck.id, data);
        setTrucks(trucks.map(truck => 
          truck.id === selectedTruck.id ? updated : truck
        ));
        toast({
          title: "Caminhão atualizado",
          description: "As informações foram atualizadas com sucesso.",
        });
      } else {
        // Criar novo caminhão
        const created = await createTruck(data);
        setTrucks([...trucks, created]);
        toast({
          title: "Caminhão cadastrado",
          description: "Novo caminhão adicionado com sucesso.",
        });
      }
      setFormOpen(false);
    } catch (err: any) {
      console.error("Erro ao salvar caminhão:", err);
      setFormError(err.response?.data?.message || err.message || "Erro ao salvar dados");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <TruckList
        trucks={trucks}
        isLoading={isLoading}
        error={error}
        onEdit={handleEdit}
        onDelete={handleDeleteConfirm}
        onAddNew={handleAddNew}
        onRefresh={fetchTrucks}
        onSearch={handleSearch}
      />

      {/* Formulário de cadastro/edição */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTruck ? "Editar Caminhão" : "Novo Caminhão"}
            </DialogTitle>
            <DialogDescription>
              {selectedTruck
                ? "Atualize as informações do caminhão"
                : "Preencha os dados para cadastrar um novo caminhão"}
            </DialogDescription>
          </DialogHeader>
          
          <TruckRegistrationForm
            truck={selectedTruck}
            onSuccess={() => {
              setFormOpen(false);
              fetchTrucks();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este caminhão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TruckManager;
