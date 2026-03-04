import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Droplet, Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import FuelForm from "./FuelForm";
import { Combustivel, getAllCombustiveis, createCombustivel, updateCombustivel, deleteCombustivel } from "@/services/fuels-api";

const FuelsManager = () => {
  const [combustiveis, setCombustiveis] = useState<Combustivel[]>([]);
  const [filtered, setFiltered] = useState<Combustivel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Combustivel | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Combustivel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getAllCombustiveis();
      setCombustiveis(data);
      applyFilter(data, searchTerm);
    } catch {
      toast({ title: "Erro ao carregar combustíveis", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (list: Combustivel[], term: string) => {
    if (!term) return setFiltered(list);
    const t = term.toLowerCase();
    setFiltered(list.filter(c =>
      c.nome.toLowerCase().includes(t) ||
      (c.codigo && c.codigo.toLowerCase().includes(t))
    ));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { applyFilter(combustiveis, searchTerm); }, [combustiveis, searchTerm]);

  const handleSave = async (combustivel: Combustivel) => {
    try {
      if (combustivel.id) {
        const updated = await updateCombustivel(combustivel.id, combustivel);
        setCombustiveis(prev => prev.map(c => c.id === combustivel.id ? updated : c));
        toast({ title: "Combustível atualizado com sucesso" });
      } else {
        const created = await createCombustivel(combustivel);
        setCombustiveis(prev => [...prev, created]);
        toast({ title: "Combustível criado com sucesso" });
      }
      setIsFormOpen(false);
      setSelected(undefined);
    } catch {
      toast({ title: "Erro ao salvar combustível", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteCombustivel(deleteTarget.id);
      setCombustiveis(prev => prev.filter(c => c.id !== deleteTarget.id));
      toast({ title: "Combustível desativado com sucesso" });
    } catch {
      toast({ title: "Erro ao desativar combustível", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const openEdit = (c: Combustivel) => { setSelected(c); setIsFormOpen(true); };
  const openNew = () => { setSelected(undefined); setIsFormOpen(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Droplet className="w-5 h-5 text-emerald-500" />
          Catálogo de Combustíveis
        </h2>
        <Button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" />
          Novo Combustível
        </Button>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Buscar por nome ou código..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 dark:text-slate-400" />
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <span className="ml-2 text-slate-500 dark:text-slate-400">Carregando...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Nome</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white hidden sm:table-cell">Código</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white hidden sm:table-cell">Unidade</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Status</th>
                  <th className="py-3 px-4 text-right text-slate-900 dark:text-white">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      {combustiveis.length === 0
                        ? "Nenhum combustível cadastrado. Clique em 'Novo Combustível' para começar."
                        : "Nenhum combustível encontrado."}
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => (
                    <tr key={c.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{c.nome}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden sm:table-cell">{c.codigo || '-'}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden sm:table-cell capitalize">{c.unidade}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="py-3 px-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Mostrando {filtered.length} de {combustiveis.length} registros
              </span>
            </div>
          </div>
        )}
      </div>

      <FuelForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={selected}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar combustível?</AlertDialogTitle>
            <AlertDialogDescription>
              O combustível <strong>{deleteTarget?.nome}</strong> será marcado como inativo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FuelsManager;
