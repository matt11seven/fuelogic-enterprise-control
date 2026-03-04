import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { Posto } from "@/services/stations-api";

interface StationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (posto: Posto) => void;
  initialData?: Posto;
}

const emptyPosto: Posto = {
  nome: '',
  cnpj: '',
  erp: '',
  codigo_empresa_erp: '',
  id_unidade: '',
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  status: 'ativo',
};

const StationForm = ({ isOpen, onClose, onSave, initialData }: StationFormProps) => {
  const [posto, setPosto] = useState<Posto>(emptyPosto);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setPosto(initialData ? { ...initialData } : { ...emptyPosto });
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (field: keyof Posto, value: string) => {
    setPosto(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!posto.nome?.trim()) newErrors.nome = 'Nome é obrigatório';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) onSave(posto);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar' : 'Novo'} Posto / Unidade</DialogTitle>
          <DialogDescription>
            {initialData ? 'Edite as informações do posto.' : 'Preencha para cadastrar um novo posto.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Nome e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className={errors.nome ? 'text-red-500' : ''}>
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                value={posto.nome}
                onChange={e => handleChange('nome', e.target.value)}
                placeholder="Nome do posto ou unidade"
                className={errors.nome ? 'border-red-500' : ''}
              />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={posto.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CNPJ e ERP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={posto.cnpj || ''}
                onChange={e => handleChange('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="erp">ERP</Label>
              <Select value={posto.erp || ''} onValueChange={v => handleChange('erp', v)}>
                <SelectTrigger id="erp"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emsys">EMSYS</SelectItem>
                  <SelectItem value="sap">SAP</SelectItem>
                  <SelectItem value="oracle">Oracle</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Código ERP e ID Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo_empresa_erp">Código Empresa ERP</Label>
              <Input
                id="codigo_empresa_erp"
                value={posto.codigo_empresa_erp || ''}
                onChange={e => handleChange('codigo_empresa_erp', e.target.value)}
                placeholder="Código no ERP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id_unidade">ID Unidade (ref. externa)</Label>
              <Input
                id="id_unidade"
                value={posto.id_unidade || ''}
                onChange={e => handleChange('id_unidade', e.target.value)}
                placeholder="Referência externa"
              />
            </div>
          </div>

          {/* Endereço */}
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-2">Endereço</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={posto.cep || ''}
                onChange={e => handleChange('cep', e.target.value)}
                placeholder="00000-000"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                value={posto.logradouro || ''}
                onChange={e => handleChange('logradouro', e.target.value)}
                placeholder="Rua, Avenida..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={posto.numero || ''}
                onChange={e => handleChange('numero', e.target.value)}
                placeholder="Nº"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={posto.bairro || ''}
                onChange={e => handleChange('bairro', e.target.value)}
                placeholder="Bairro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={posto.cidade || ''}
                onChange={e => handleChange('cidade', e.target.value)}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">UF</Label>
              <Input
                id="estado"
                value={posto.estado || ''}
                onChange={e => handleChange('estado', e.target.value.toUpperCase())}
                placeholder="UF"
                maxLength={2}
              />
            </div>
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

export default StationForm;
