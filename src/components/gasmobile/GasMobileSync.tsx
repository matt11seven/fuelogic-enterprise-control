import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Download,
  Building2,
  Droplet,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  PlusCircle,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  getGMPreview,
  importGMData,
  GMPreview,
  GMPostoPreview,
  GMCombustivelPreview,
} from "@/services/gasmobile-api";

const StatusBadge = ({ status }: { status: "novo" | "existente" }) =>
  status === "novo" ? (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 gap-1 text-xs">
      <PlusCircle className="w-3 h-3" /> Novo
    </Badge>
  ) : (
    <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 gap-1 text-xs">
      <CheckCircle2 className="w-3 h-3" /> Já cadastrado
    </Badge>
  );

const GasMobileSync = () => {
  const [preview, setPreview] = useState<GMPreview | null>(null);
  const [postos, setPostos] = useState<GMPostoPreview[]>([]);
  const [combustiveis, setCombustiveis] = useState<GMCombustivelPreview[]>([]);
  const [selectedPostos, setSelectedPostos] = useState<Set<number>>(new Set());
  const [selectedCombustiveis, setSelectedCombustiveis] = useState<Set<string>>(new Set());
  const [expandedPostos, setExpandedPostos] = useState<Set<number>>(new Set());
  const [editingNome, setEditingNome] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const fetchPreview = async () => {
    setIsLoading(true);
    try {
      const data = await getGMPreview();
      setPreview(data);
      setPostos(data.postos);
      setCombustiveis(data.combustiveis);
      // Pré-selecionar apenas os novos
      setSelectedPostos(new Set(data.postos.filter(p => p.status === "novo").map(p => p.id_unidade)));
      setSelectedCombustiveis(new Set(data.combustiveis.filter(c => c.status === "novo").map(c => c.nome)));
      setExpandedPostos(new Set(data.postos.map(p => p.id_unidade)));
    } catch {
      toast({
        title: "Erro ao buscar dados GasMobile",
        description: "Verifique se sua API Key está configurada.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePosto = (id: number) => {
    setSelectedPostos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCombustivel = (nome: string) => {
    setSelectedCombustiveis(prev => {
      const next = new Set(prev);
      next.has(nome) ? next.delete(nome) : next.add(nome);
      return next;
    });
  };

  const startEdit = (id: number, nome: string) =>
    setEditingNome(prev => ({ ...prev, [id]: nome }));

  const confirmEdit = (id: number) => {
    const novo = editingNome[id]?.trim();
    if (novo) setPostos(prev => prev.map(p => p.id_unidade === id ? { ...p, nome: novo } : p));
    setEditingNome(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const cancelEdit = (id: number) =>
    setEditingNome(prev => { const n = { ...prev }; delete n[id]; return n; });

  const handleImport = async () => {
    const postosParaImportar = postos.filter(p => selectedPostos.has(p.id_unidade));
    const combustiveisParaImportar = combustiveis.filter(c => selectedCombustiveis.has(c.nome));

    if (postosParaImportar.length === 0 && combustiveisParaImportar.length === 0) {
      toast({ title: "Nenhum item novo selecionado", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const result = await importGMData({
        postos: postosParaImportar,
        combustiveis: combustiveisParaImportar,
      });
      const r = result.resultado;
      toast({
        title: "Importação concluída",
        description: `${r.postos_criados} postos, ${r.tanques_criados} tanques e ${r.combustiveis_criados} combustíveis cadastrados.`,
      });
      await fetchPreview();
    } catch {
      toast({ title: "Erro na importação", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const novosPostos = postos.filter(p => p.status === "novo").length;
  const novosComb = combustiveis.filter(c => c.status === "novo").length;
  const temNovos = novosPostos > 0 || novosComb > 0;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cadastre postos, tanques e combustíveis a partir dos dados da API GasMobile.
          {" "}<span className="text-xs text-slate-400">(Medições em tempo real continuam sendo puxadas diretamente da API)</span>
        </p>
        <Button onClick={fetchPreview} disabled={isLoading} variant="outline" className="gap-2 shrink-0">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {preview ? "Atualizar" : "Buscar dados GasMobile"}
        </Button>
      </div>

      {preview && (
        <>
          {/* Resumo */}
          <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <Building2 className="w-4 h-4 text-emerald-500" />
              {novosPostos > 0
                ? <><strong className="text-emerald-600">{novosPostos} novo{novosPostos > 1 ? 's' : ''}</strong> / {postos.length - novosPostos} já cadastrado{postos.length - novosPostos !== 1 ? 's' : ''}</>
                : <span>Todos os {postos.length} postos já estão cadastrados</span>
              }
            </span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <Droplet className="w-4 h-4 text-blue-500" />
              {novosComb > 0
                ? <><strong className="text-blue-600">{novosComb} combustível{novosComb > 1 ? 'is' : ''} novo{novosComb > 1 ? 's' : ''}</strong></>
                : <span>Todos os combustíveis já estão cadastrados</span>
              }
            </span>
          </div>

          {/* Combustíveis */}
          {combustiveis.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Droplet className="w-4 h-4 text-blue-500" /> Combustíveis detectados
              </h3>
              <div className="flex flex-wrap gap-2">
                {combustiveis.map(c => (
                  <button
                    key={c.nome}
                    type="button"
                    disabled={c.status === "existente"}
                    onClick={() => c.status === "novo" && toggleCombustivel(c.nome)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      c.status === "existente"
                        ? "opacity-60 cursor-default border-slate-200 dark:border-slate-700 text-slate-500"
                        : selectedCombustiveis.has(c.nome)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-transparent border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
                    }`}
                  >
                    <StatusBadge status={c.status} />
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Postos */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Building2 className="w-4 h-4 text-emerald-500" /> Postos e tanques detectados
            </h3>
            {postos.map(posto => {
              const isSelected = selectedPostos.has(posto.id_unidade);
              const isExpanded = expandedPostos.has(posto.id_unidade);
              const isEditing = posto.id_unidade in editingNome;

              return (
                <div
                  key={posto.id_unidade}
                  className={`rounded-lg border transition-colors ${
                    isSelected && posto.status === "novo"
                      ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Checkbox — só habilitado para novos */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={posto.status === "existente"}
                      onChange={() => togglePosto(posto.id_unidade)}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer disabled:cursor-default disabled:opacity-40"
                    />

                    {/* Nome editável */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingNome[posto.id_unidade]}
                          onChange={e => setEditingNome(prev => ({ ...prev, [posto.id_unidade]: e.target.value }))}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') confirmEdit(posto.id_unidade); if (e.key === 'Escape') cancelEdit(posto.id_unidade); }}
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600" onClick={() => confirmEdit(posto.id_unidade)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => cancelEdit(posto.id_unidade)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-medium text-sm truncate">{posto.nome}</span>
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 shrink-0"
                          onClick={() => startEdit(posto.id_unidade, posto.nome)}
                          title="Editar nome"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 hidden sm:inline">{posto.cliente_gm}</span>
                      <StatusBadge status={posto.status} />
                      <button
                        type="button"
                        onClick={() => setExpandedPostos(prev => { const n = new Set(prev); n.has(posto.id_unidade) ? n.delete(posto.id_unidade) : n.add(posto.id_unidade); return n; })}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Tanques */}
                  {isExpanded && posto.tanques.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50">
                            <th className="py-2 px-3 text-left text-slate-500">Tanque</th>
                            <th className="py-2 px-3 text-left text-slate-500">Produto</th>
                            <th className="py-2 px-3 text-right text-slate-500">Capacidade (L)</th>
                            <th className="py-2 px-3 text-right text-slate-500">Atual (L) ¹</th>
                            <th className="py-2 px-3 text-right text-slate-500">Nível % ¹</th>
                            <th className="py-2 px-3 text-center text-slate-500">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {posto.tanques.map(t => (
                            <tr key={t.numero_tanque} className="border-t border-slate-100 dark:border-slate-800">
                              <td className="py-2 px-3 font-medium">#{t.numero_tanque}</td>
                              <td className="py-2 px-3">{t.produto}</td>
                              <td className="py-2 px-3 text-right">{t.capacidade.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                              <td className="py-2 px-3 text-right text-slate-400">{t.quantidade_atual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                              <td className="py-2 px-3 text-right text-slate-400">{t.nivel_percentual.toFixed(1)}%</td>
                              <td className="py-2 px-3 text-center"><StatusBadge status={t.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-xs text-slate-400 px-3 py-1.5 italic">¹ Exibido apenas como referência — medições em tempo real, não são gravadas.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botão importar */}
          {temNovos && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleImport}
                disabled={isImporting || (selectedPostos.size === 0 && selectedCombustiveis.size === 0)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isImporting ? "Importando..." : `Cadastrar selecionados`}
              </Button>
            </div>
          )}

          {!temNovos && (
            <p className="text-sm text-center text-slate-400 py-2">
              Todos os dados da GasMobile já estão cadastrados no sistema.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default GasMobileSync;
