import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  AlertCircle,
  Save,
  X 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: any) => void;
  initialData?: Contact;
}

export interface Contact {
  id?: number;
  nome: string;
  telefone: string;
  documento?: string;
  email?: string;
  nome_auxiliar?: string;
  tipo: 'distribuidora' | 'fornecedor' | 'gerente' | 'supervisor' | 'proprietario' | 'manutencao';
  observacoes?: string;
  status: 'ativo' | 'inativo';
}

export const PeopleForm = ({ isOpen, onClose, onSave, initialData }: ContactFormProps) => {
  const [contact, setContact] = useState<Contact>({
    nome: '',
    telefone: '',
    documento: '',
    email: '',
    nome_auxiliar: '',
    tipo: 'distribuidora',
    observacoes: '',
    status: 'ativo',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setContact(initialData);
    } else {
      setContact({
        nome: '',
        telefone: '',
        documento: '',
        email: '',
        nome_auxiliar: '',
        tipo: 'distribuidora',
        observacoes: '',
        status: 'ativo',
      });
    }
  }, [initialData, isOpen]);

  const validateField = (field: keyof Contact, value: any) => {
    let error = '';
    switch (field) {
      case 'nome':
        if (!value) error = 'Nome é obrigatório';
        break;
      case 'telefone':
        if (!value) {
          error = 'Telefone é obrigatório';
        } else if (!/^\d{10,15}$/.test(value)) {
          error = 'Telefone deve ter entre 10 e 15 dígitos numéricos';
        }
        break;
      case 'documento':
        if (value) {
          const cleanDoc = value.replace(/\D/g, '');
          if (cleanDoc.length === 11) { // CPF
            if (!/^\d{11}$/.test(cleanDoc)) {
              error = 'CPF deve conter 11 dígitos numéricos';
            }
          } else if (cleanDoc.length === 14) { // CNPJ
            if (!/^\d{14}$/.test(cleanDoc)) {
              error = 'CNPJ deve conter 14 dígitos numéricos';
            }
          } else {
            error = 'Documento inválido. Use CPF (11 dígitos) ou CNPJ (14 dígitos)';
          }
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Email inválido';
        }
        break;
    }
    return error;
  };

  const handleInputChange = (field: keyof Contact, value: any) => {
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
    setContact(prev => ({ ...prev, [field]: value }));
  };

  const formatDocument = (doc: string) => {
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) { // CPF
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (clean.length === 14) { // CNPJ
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  const formatTelefone = (tel: string) => {
    const clean = tel.replace(/\D/g, '');
    if (clean.length === 11) { // Celular com DDD
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '+55 $1 $2-$3');
    } else if (clean.length === 10) { // Fixo com DDD
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, '+55 $1 $2-$3');
    }
    return tel;
  };

  const handleSubmit = () => {
    // Validar todos os campos
    const newErrors: Record<string, string> = {};
    Object.keys(contact).forEach((key) => {
      const field = key as keyof Contact;
      const error = validateField(field, contact[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSave(contact);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{initialData ? 'Editar' : 'Novo'} Contato</DialogTitle>
          <DialogDescription>
            {initialData 
              ? 'Edite as informações do contato abaixo.' 
              : 'Preencha o formulário para cadastrar um novo contato.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Informações principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className={errors.nome ? 'text-red-500' : ''}>
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                value={contact.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Nome completo ou razão social"
                className={errors.nome ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {errors.nome && (
                <p className="text-xs text-red-500">{errors.nome}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome_auxiliar">Nome Auxiliar / Apelido</Label>
              <Input
                id="nome_auxiliar"
                value={contact.nome_auxiliar || ''}
                onChange={(e) => handleInputChange('nome_auxiliar', e.target.value)}
                placeholder="Nome fantasia ou apelido"
              />
            </div>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone" className={errors.telefone ? 'text-red-500' : ''}>
                Telefone <span className="text-red-500">*</span>
                <span className="text-xs text-slate-500 ml-2 font-normal">(formato: 5584999991234)</span>
              </Label>
              <Input
                id="telefone"
                value={contact.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value.replace(/\D/g, ''))}
                placeholder="5584999991234"
                className={errors.telefone ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {errors.telefone && (
                <p className="text-xs text-red-500">{errors.telefone}</p>
              )}
              {contact.telefone && !errors.telefone && (
                <p className="text-xs text-slate-500">
                  Visualização: {formatTelefone(contact.telefone)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={errors.email ? 'text-red-500' : ''}>Email</Label>
              <Input
                id="email"
                type="email"
                value={contact.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@exemplo.com"
                className={errors.email ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Documento e Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documento" className={errors.documento ? 'text-red-500' : ''}>
                CPF/CNPJ
              </Label>
              <Input
                id="documento"
                value={contact.documento || ''}
                onChange={(e) => handleInputChange('documento', e.target.value.replace(/\D/g, ''))}
                placeholder="Somente números"
                maxLength={14}
                className={errors.documento ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {errors.documento && (
                <p className="text-xs text-red-500">{errors.documento}</p>
              )}
              {contact.documento && !errors.documento && (
                <p className="text-xs text-slate-500">
                  Visualização: {formatDocument(contact.documento)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">
                Tipo <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={contact.tipo} 
                onValueChange={(value) => handleInputChange('tipo', value as Contact['tipo'])}
              >
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Tipo de Contato</SelectLabel>
                    <SelectItem value="distribuidora">Distribuidora</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="proprietario">Proprietário</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status e Observações */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={contact.status} 
              onValueChange={(value) => handleInputChange('status', value as Contact['status'])}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={contact.observacoes || ''}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações adicionais sobre este contato"
              className="min-h-[100px]"
            />
          </div>

          {(errors.nome || errors.telefone) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Por favor, corrija os erros antes de salvar.
              </AlertDescription>
            </Alert>
          )}
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

export default PeopleForm;
