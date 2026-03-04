import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Factory, Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import SupplierForm from "./SupplierForm";
import { Fornecedor, getAllFornecedores, createFornecedor, updateFornecedor, deleteFornecedor } from "@/services/suppliers-api";
import { getAllCombustiveis, Combustivel } from "@/services/fuels-api";

const SuppliersManager = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [filtered, setFiltered] = useState<Fornecedor[]>([]);
  const [combustiveis, setCombustiveis] = useState<Combustivel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Fornecedor | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Fornecedor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setIsLoading(true);
    try {
      const [data, combData] = await Promise.all([getAllFornecedores(), getAllCombustiveis()]);
      setFornecedores(data);
      setCombustiveis(combData);
      applyFilter(data, searchTerm);
    } catch {
      toast({ title: "Erro ao carregar fornecedores", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (list: Fornecedor[], term: string) => {
    if (!term) return setFiltered(list);
    const t = term.toLowerCase();
    setFiltered(list.filter(f =>
      f.razao_social.toLowerCase().includes(t) ||
      (f.nome_fantasia && f.nome_fantasia.toLowerCase().includes(t)) ||
      (f.cnpj && f.cnpj.includes(t))
    ));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { applyFilter(fornecedores, searchTerm); }, [fornecedores, searchTerm]);

  const handleSave = async (fornecedor: Fornecedor) => {
    try {
      if (fornecedor.id) {
        const updated = await updateFornecedor(fornecedor.id, fornecedor);
        setFornecedores(prev => prev.map(f => f.id === fornecedor.id ? updated : f));
        toast({ title: "Fornecedor atualizado com sucesso" });
      } else {
        const created = await createFornecedor(fornecedor);
        setFornecedores(prev => [...prev, created]);
        toast({ title: "Fornecedor criado com sucesso" });
      }
      setIsFormOpen(false);
      setSelected(undefined);
    } catch {
      toast({ title: "Erro ao salvar fornecedor", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteFornecedor(deleteTarget.id);
      setFornecedores(prev => prev.filter(f => f.id !== deleteTarget.id));
      toast({ title: "Fornecedor desativado com sucesso" });
    } catch {
      toast({ title: "Erro ao desativar fornecedor", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const openEdit = (f: Fornecedor) => { setSelected(f); setIsFormOpen(true); };
  const openNew = () => { setSelected(undefined); setIsFormOpen(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Factory className="w-5 h-5 text-emerald-500" />
          Fornecedores
        </h2>
        <Button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
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
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Razão Social</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white hidden sm:table-cell">CNPJ</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white hidden md:table-cell">Contato</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white hidden lg:table-cell">Prazo (dias)</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Status</th>
                  <th className="py-3 px-4 text-right text-slate-900 dark:text-white">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      {fornecedores.length === 0
                        ? "Nenhum fornecedor cadastrado. Clique em 'Novo Fornecedor' para começar."
                        : "Nenhum fornecedor encontrado."}
                    </td>
                  </tr>
                ) : (
                  filtered.map(f => (
                    <tr key={f.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-900 dark:text-white">
                        <div className="font-medium">{f.razao_social}</div>
                        {f.nome_fantasia && (
                          <div className="text-xs text-slate-500">{f.nome_fantasia}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                        {f.cnpj || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                        <div>{f.contato_comercial || '-'}</div>
                        {f.telefone && <div className="text-xs">{f.telefone}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                        {f.prazo_entrega_dias ?? '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          f.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {f.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(f)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget(f)}
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
                Mostrando {filtered.length} de {fornecedores.length} registros
              </span>
            </div>
          </div>
        )}
      </div>

      <SupplierForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={selected}
        combustiveis={combustiveis}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              O fornecedor <strong>{deleteTarget?.razao_social}</strong> será marcado como inativo.
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

export default SuppliersManager;
