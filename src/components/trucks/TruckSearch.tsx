
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
    <form onSubmit={handleSearch} className="relative flex w-full max-w-sm items-center">
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pr-16 filter-field"
      />
      {query && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-8 h-full hover:bg-slate-100 dark:hover:bg-slate-700"
          onClick={clearSearch}
        >
          <X className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="sr-only">Limpar busca</span>
        </Button>
      )}
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="absolute right-0 h-full hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        <span className="sr-only">Buscar</span>
      </Button>
    </form>
  );
};

export default TruckSearch;
