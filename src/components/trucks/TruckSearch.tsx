
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface TruckSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const TruckSearch = ({ 
  onSearch, 
  placeholder = "Buscar por placa ou motorista..." 
}: TruckSearchProps) => {
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const clearSearch = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <form onSubmit={handleSearch} className="relative flex w-full max-w-md items-center">
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="filter-field pr-20 pl-4 py-3 text-sm font-medium placeholder:font-normal"
      />
      {query && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-10 h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
          onClick={clearSearch}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Limpar busca</span>
        </Button>
      )}
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="absolute right-1 h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200"
      >
        <Search className="h-4 w-4" />
        <span className="sr-only">Buscar</span>
      </Button>
    </form>
  );
};

export default TruckSearch;

