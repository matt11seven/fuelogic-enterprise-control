

import { Grid, List, Table, Building2 } from "lucide-react";
import { Button } from "./ui/button";

interface ViewToggleProps {
  viewMode: 'cards' | 'list' | 'table' | 'grouped';
  onViewChange: (mode: 'cards' | 'list' | 'table' | 'grouped') => void;
}

export function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg p-1">
      <Button
        variant={viewMode === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('cards')}
        className={`px-3 py-1 h-8 ${viewMode === 'cards' ? 'bg-slate-700' : 'hover:bg-slate-700/50'}`}
        title="Visualização em cards"
      >
        <Grid className="w-4 h-4 mr-2" />
        <span className="text-xs">Cards</span>
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        className={`px-3 py-1 h-8 ${viewMode === 'list' ? 'bg-slate-700' : 'hover:bg-slate-700/50'}`}
        title="Visualização em lista"
      >
        <List className="w-4 h-4 mr-2" />
        <span className="text-xs">Lista</span>
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className={`px-3 py-1 h-8 ${viewMode === 'table' ? 'bg-slate-700' : 'hover:bg-slate-700/50'}`}
        title="Visualização em tabela"
      >
        <Table className="w-4 h-4 mr-2" />
        <span className="text-xs">Tabela</span>
      </Button>
      <Button
        variant={viewMode === 'grouped' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grouped')}
        className={`px-3 py-1 h-8 ${viewMode === 'grouped' ? 'bg-slate-700' : 'hover:bg-slate-700/50'}`}
        title="Visualização agrupada por unidade"
      >
        <Building2 className="w-4 h-4 mr-2" />
        <span className="text-xs">Agrupado</span>
      </Button>
    </div>
  );
}

export default ViewToggle;

