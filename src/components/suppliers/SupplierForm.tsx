import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Info } from "lucide-react";
import { Fornecedor } from "@/services/suppliers-api";
import { Combustivel } from "@/services/fuels-api";

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fornecedor: Fornecedor) => void;
  initialData?: Fornecedor;
  combustiveis: Combustivel[];
}

const empty: Fornecedor = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  telefone: '',
  email: '',
  contato_comercial: '',
  prazo_entrega_dias: undefined,
  observacoes: '',
  status: 'ativo',
  combustivel_ids: [],
};

const SupplierForm = ({ isOpen, onClose, onSave, initialData, combustiveis }: SupplierFormProps) => {
  const [fornecedor, setFornecedor] = useState<Fornecedor>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFornecedor({
        ...initialData,
        combustivel_ids: initialData.combustiveis?.map((c: any) => c.id) || initialData.combustivel_ids || [],
      });
    } else {
      setFornecedor({ ...empty });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (field: keyof Fornecedor, value: any) => {
    setFornecedor(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleCombustivel = (id: number) => {
    const ids = fornecedor.combustivel_ids || [];
    handleChange('combustivel_ids', ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!fornecedor.razao_social?.trim()) newErrors.razao_social = 'Razão social é obrigatória';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) onSave(fornecedor);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar' : 'Novo'} Fornecedor</DialogTitle>
          <DialogDescription>
            {initialData ? 'Edite os dados do fornecedor.' : 'Cadastre um novo fornecedor.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razao_social" className={errors.razao_social ? 'text-red-500' : ''}>
                Razão Social <span className="text-red-500">*</span>
              </Label>
              <Input
                id="razao_social"
                value={fornecedor.razao_social}
                onChange={e => handleChange('razao_social', e.target.value)}
                placeholder="Razão social"
                className={errors.razao_social ? 'border-red-500' : ''}
              />
              {errors.razao_social && <p className="text-xs text-red-500">{errors.razao_social}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
              <Input
                id="nome_fantasia"
                value={fornecedor.nome_fantasia || ''}
                onChange={e => handleChange('nome_fantasia', e.target.value)}
                placeholder="Nome fantasia"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={fornecedor.cnpj || ''}
                onChange={e => handleChange('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={fornecedor.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={fornecedor.telefone || ''}
                onChange={e => handleChange('telefone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={fornecedor.email || ''}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="email@empresa.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contato_comercial">Contato Comercial</Label>
              <Input
                id="contato_comercial"
                value={fornecedor.contato_comercial || ''}
                onChange={e => handleChange('contato_comercial', e.target.value)}
                placeholder="Nome do representante"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prazo_entrega_dias">Prazo Médio de Entrega (dias)</Label>
              <Input
                id="prazo_entrega_dias"
                type="number"
                min={0}
                value={fornecedor.prazo_entrega_dias ?? ''}
                onChange={e => handleChange('prazo_entrega_dias', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ex: 2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="custo_frete_proprio_rl">Custo Frete Próprio (R$/L)</Label>
              <span
                title="Custo do seu transporte por litro. Usado no cálculo do custo real quando o fornecedor pratica FOB."
                className="text-slate-400 hover:text-slate-600 cursor-help"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </div>
            <Input
              id="custo_frete_proprio_rl"
              type="number"
              min={0}
              step={0.0001}
              value={fornecedor.custo_frete_proprio_rl ?? ''}
              onChange={e => handleChange('custo_frete_proprio_rl', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Ex: 0.12"
            />
            <p className="text-xs text-slate-500">Preencha apenas para frete FOB. Deixe 0 para CIF.</p>
          </div>

          {/* Combustíveis */}
          {combustiveis.length > 0 && (
            <div className="space-y-2">
              <Label>Combustíveis que distribui</Label>
              <div className="flex flex-wrap gap-2">
                {combustiveis.map(c => {
                  const selected = (fornecedor.combustivel_ids || []).includes(c.id!);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCombustivel(c.id!)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                      }`}
                    >
                      {c.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={fornecedor.observacoes || ''}
              onChange={e => handleChange('observacoes', e.target.value)}
              placeholder="Observações adicionais"
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierForm;
