import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { Combustivel } from "@/services/fuels-api";

interface FuelFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (combustivel: Combustivel) => void;
  initialData?: Combustivel;
}

const empty: Combustivel = { nome: '', codigo: '', unidade: 'litros', status: 'ativo' };

const FuelForm = ({ isOpen, onClose, onSave, initialData }: FuelFormProps) => {
  const [combustivel, setCombustivel] = useState<Combustivel>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setCombustivel(initialData ? { ...initialData } : { ...empty });
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (field: keyof Combustivel, value: string) => {
    setCombustivel(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!combustivel.nome?.trim()) newErrors.nome = 'Nome é obrigatório';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) onSave(combustivel);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar' : 'Novo'} Combustível</DialogTitle>
          <DialogDescription>
            {initialData ? 'Edite o tipo de combustível.' : 'Cadastre um novo tipo de combustível.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className={errors.nome ? 'text-red-500' : ''}>
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              value={combustivel.nome}
              onChange={e => handleChange('nome', e.target.value)}
              placeholder="Ex: Diesel S-10"
              className={errors.nome ? 'border-red-500' : ''}
            />
            {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigo">Código Interno</Label>
            <Input
              id="codigo"
              value={combustivel.codigo || ''}
              onChange={e => handleChange('codigo', e.target.value)}
              placeholder="Código interno"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade <span className="text-red-500">*</span></Label>
              <Select value={combustivel.unidade} onValueChange={v => handleChange('unidade', v)}>
                <SelectTrigger id="unidade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="litros">Litros</SelectItem>
                  <SelectItem value="m3">m³</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={combustivel.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
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

export default FuelForm;
