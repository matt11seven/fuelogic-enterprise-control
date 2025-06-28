import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, UserPlus, Phone, FileSpreadsheet, Pencil, Trash2, Loader2 } from "lucide-react";
import PeopleForm, { Contact } from "./PeopleForm";
import { useToast } from "@/components/ui/use-toast";
import contactApi from "@/services/contact-api";

const PeopleManager = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Carregar contatos do backend
  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const data = await contactApi.getAllContacts();
      setContacts(data);
      applyFilters(data, searchTerm, typeFilter);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      toast({
        title: "Erro ao carregar contatos",
        description: "Não foi possível carregar a lista de contatos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Aplicar filtros aos contatos
  const applyFilters = (contacts: Contact[], term: string, type: string) => {
    let filtered = contacts;
    
    // Filtrar por termo de busca
    if (term) {
      filtered = filtered.filter(contact => 
        contact.nome.toLowerCase().includes(term.toLowerCase()) ||
        (contact.email && contact.email.toLowerCase().includes(term.toLowerCase())) ||
        contact.telefone.includes(term) ||
        (contact.nome_auxiliar && contact.nome_auxiliar.toLowerCase().includes(term.toLowerCase()))
      );
    }
    
    // Filtrar por tipo
    if (type) {
      filtered = filtered.filter(contact => contact.tipo === type);
    }
    
    setFilteredContacts(filtered);
  };

  // Efeito para carregar contatos na montagem do componente
  useEffect(() => {
    loadContacts();
  }, []);

  // Efeito para aplicar filtros quando os critérios mudarem
  useEffect(() => {
    applyFilters(contacts, searchTerm, typeFilter);
  }, [contacts, searchTerm, typeFilter]);

  const handleSaveContact = async (contact: Contact) => {
    try {
      if (contact.id) {
        // Atualizar contato existente
        const updated = await contactApi.updateContact(contact.id, contact);
        setContacts(prev => 
          prev.map(c => c.id === contact.id ? updated : c)
        );
        toast({
          title: "Contato atualizado",
          description: `O contato "${contact.nome}" foi atualizado com sucesso.`,
        });
      } else {
        // Criar novo contato
        const created = await contactApi.createContact(contact);
        setContacts(prev => [...prev, created]);
        toast({
          title: "Contato criado",
          description: `O contato "${contact.nome}" foi criado com sucesso.`,
        });
      }
      setIsFormOpen(false);
      setSelectedContact(undefined);
    } catch (error) {
      toast({
        title: "Erro ao salvar contato",
        description: contact.id ? 
          "Não foi possível atualizar o contato." : 
          "Não foi possível criar o contato.",
        variant: "destructive"
      });
    }
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsFormOpen(true);
  };

  const handleDeleteContact = async (id: number) => {
    try {
      await contactApi.deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Contato removido",
        description: "O contato foi removido com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao remover contato",
        description: "Não foi possível remover o contato.",
        variant: "destructive"
      });
    }
  };

  const openNewContactForm = () => {
    setSelectedContact(undefined);
    setIsFormOpen(true);
  };

  // Função para lidar com importação de CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await contactApi.importContactsFromCSV(file);
      toast({
        title: "Importação concluída",
        description: `${result.success} contatos importados com sucesso. ${result.failed} falhas.`,
      });
      loadContacts(); // Recarregar a lista após importação
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar os contatos do arquivo CSV.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      // Limpar o input de arquivo
      event.target.value = '';
    }
  };

  // Função para lidar com exportação de CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await contactApi.exportContactsToCSV();
      toast({
        title: "Exportação concluída",
        description: "Os contatos foram exportados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os contatos para CSV.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Função para formatar o telefone para exibição
  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) { // Celular com DDD
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '+55 $1 $2-$3');
    } else if (clean.length === 10) { // Fixo com DDD
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, '+55 $1 $2-$3');
    }
    return phone;
  };

  // Tradução dos tipos para exibição
  const tipoDisplay: Record<string, string> = {
    distribuidora: "Distribuidora",
    fornecedor: "Fornecedor",
    gerente: "Gerente",
    supervisor: "Supervisor",
    proprietario: "Proprietário",
    manutencao: "Manutenção"
  };

  // Cores para os badges de tipo
  const tipoBadgeColors: Record<string, string> = {
    distribuidora: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    fornecedor: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    gerente: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    supervisor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    proprietario: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    manutencao: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Cadastro de Pessoas</h2>
        <Button 
          onClick={openNewContactForm} 
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <UserPlus className="w-4 h-4" />
          Nova Pessoa
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="lg:col-span-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 dark:text-slate-400" />
          </div>
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Filtrar por tipo</option>
            <option value="distribuidora">Distribuidora</option>
            <option value="fornecedor">Fornecedor</option>
            <option value="gerente">Gerente</option>
            <option value="supervisor">Supervisor</option>
            <option value="proprietario">Proprietário</option>
            <option value="manutencao">Manutenção</option>
          </select>
          <Filter className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
      </div>

      <div className="flex justify-end space-x-2 mb-6">
        <input
          type="file"
          accept=".csv"
          id="csvImport"
          className="hidden"
          onChange={handleImportCSV}
        />
        <label htmlFor="csvImport">
          <Button 
            variant="outline" 
            className="flex items-center gap-2" 
            disabled={isImporting}
            onClick={() => document.getElementById('csvImport')?.click()}
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Importar CSV
          </Button>
        </label>
        <Button 
          variant="outline" 
          className="flex items-center gap-2" 
          onClick={handleExportCSV}
          disabled={isExporting || filteredContacts.length === 0}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4" />
          )}
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <span className="ml-2 text-slate-500 dark:text-slate-400">Carregando contatos...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Nome</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Telefone</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Email</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Tipo</th>
                  <th className="py-3 px-4 text-left text-slate-900 dark:text-white">Status</th>
                  <th className="py-3 px-4 text-right text-slate-900 dark:text-white">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      {contacts.length === 0 ? 
                        "Nenhum contato cadastrado. Clique em 'Nova Pessoa' para criar um contato." :
                        "Nenhum contato encontrado com os filtros selecionados."}
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="py-3 px-4 text-slate-900 dark:text-white">
                        <div className="font-medium">{contact.nome}</div>
                        {contact.nome_auxiliar && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{contact.nome_auxiliar}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <Phone className="w-4 h-4 text-emerald-500" />
                          <a href={`https://wa.me/${contact.telefone}`} target="_blank" rel="noopener" className="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400">
                            {formatPhone(contact.telefone)}
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-white">
                        {contact.email || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tipoBadgeColors[contact.tipo] || ''}`}>
                          {tipoDisplay[contact.tipo] || contact.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contact.status === "ativo" 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" 
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                          {contact.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditContact(contact)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500"
                          onClick={() => handleDeleteContact(contact.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="py-3 px-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Mostrando {filteredContacts.length} de {contacts.length} registros
              </span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled={filteredContacts.length === contacts.length}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={filteredContacts.length === contacts.length}>
                  Próximo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <PeopleForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveContact}
        initialData={selectedContact}
      />
    </div>
  );
};

export default PeopleManager;
