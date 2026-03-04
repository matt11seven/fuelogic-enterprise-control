import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Plus, Search, Pencil, Trash2, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import StationForm from "./StationForm";
import { Posto, getAllPostos, createPosto, updatePosto, deletePosto } from "@/services/stations-api";

const StationsManager = () => {
  const [postos, setPostos] = useState<Posto[]>([]);
  const [filtered, setFiltered] = useState<Posto[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Posto | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Posto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getAllPostos();
      setPostos(data);
      applyFilter(data, searchTerm);
    } catch {
      toast({ title: "Erro ao carregar postos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (list: Posto[], term: string) => {
    if (!term) return setFiltered(list);
    const t = term.toLowerCase();
    setFiltered(list.filter(p =>
      p.nome.toLowerCase().includes(t) ||
      (p.cnpj && p.cnpj.includes(t)) ||
      (p.cidade && p.cidade.toLowerCase().includes(t))
    ));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { applyFilter(postos, searchTerm); }, [postos, searchTerm]);

  const handleSave = async (posto: Posto) => {
    try {
      if (posto.id) {
        const updated = await updatePosto(posto.id, posto);
        setPostos(prev => prev.map(p => p.id === posto.id ? updated : p));
        toast({ title: "Posto atualizado com sucesso" });
      } else {
        const created = await createPosto(posto);
        setPostos(prev => [...prev, created]);
        toast({ title: "Posto criado com sucesso" });
      }
      setIsFormOpen(false);
      setSelected(undefined);
    } catch {
      toast({ title: "Erro ao salvar posto", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deletePosto(deleteTarget.id);
      setPostos(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast({ title: "Posto desativado com sucesso" });
    } catch {
      toast({ title: "Erro ao desativar posto", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const openEdit = (posto: Posto) => { setSelected(posto); setIsFormOpen(true); };
  const openNew = () => { setSelected(undefined); setIsFormOpen(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-500" />
          Postos e Unidades
        </h2>
        <Button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" />
          Novo Posto
        </Button>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ ou cidade..."
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
            <span className="ml-2 text-slate-500 dark:text-slate-400">Carregando postos...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Nome</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white hidden sm:table-cell">CNPJ</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white hidden md:table-cell">ERP</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white hidden lg:table-cell">Cidade/UF</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Status</th>
                  <th className="py-3 px-4 text-right text-slate-900 dark:text-white">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      {postos.length === 0
                        ? "Nenhum posto cadastrado. Clique em 'Novo Posto' para começar."
                        : "Nenhum posto encontrado com os filtros selecionados."}
                    </td>
                  </tr>
                ) : (
                  filtered.map(posto => (
                    <tr key={posto.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-900 dark:text-white">
                        <div className="font-medium">{posto.nome}</div>
                        {(posto.cidade || posto.estado) && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 sm:hidden">
                            <MapPin className="w-3 h-3" />
                            {[posto.cidade, posto.estado].filter(Boolean).join(' - ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                        {posto.cnpj || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                        {posto.erp ? posto.erp.toUpperCase() : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                        {[posto.cidade, posto.estado].filter(Boolean).join(' - ') || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          posto.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {posto.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(posto)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget(posto)}
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
                Mostrando {filtered.length} de {postos.length} registros
              </span>
            </div>
          </div>
        )}
      </div>

      <StationForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={selected}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar posto?</AlertDialogTitle>
            <AlertDialogDescription>
              O posto <strong>{deleteTarget?.nome}</strong> será marcado como inativo.
              Esta ação pode ser revertida editando o posto.
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

export default StationsManager;
