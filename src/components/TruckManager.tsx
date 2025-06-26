import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Divider, 
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Truck, TruckStatus, TruckFilters } from '../types/truck';
import TruckCard from './TruckCard';
import TruckSearch from './TruckSearch';
import TruckRegistrationForm from './TruckRegistrationForm';
import { getAllTrucks, deleteTruck, searchTrucks } from '../services/truck-api';

const TruckManager: React.FC = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [filteredTrucks, setFilteredTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TruckFilters>({
    status: 'all'
  });

  // Carregar caminhões ao montar o componente
  useEffect(() => {
    fetchTrucks();
  }, []);

  // Aplicar filtros e busca aos caminhões
  useEffect(() => {
    let result = [...trucks];
    
    // Aplicar filtro de status
    if (filters.status !== 'all') {
      result = result.filter(truck => truck.status === filters.status);
    }
    
    // Aplicar busca
    if (searchQuery) {
      result = result.filter(truck => 
        truck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.license_plate.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredTrucks(result);
  }, [trucks, filters, searchQuery]);

  const fetchTrucks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTrucks();
      setTrucks(data);
      setFilteredTrucks(data);
    } catch (err) {
      console.error('Erro ao buscar caminhões:', err);
      setError('Não foi possível carregar os caminhões. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length > 0) {
      try {
        setLoading(true);
        const results = await searchTrucks(query);
        setFilteredTrucks(results);
      } catch (err) {
        console.error('Erro na busca:', err);
      } finally {
        setLoading(false);
      }
    } else {
      // Se a busca estiver vazia, mostrar todos os caminhões (com filtros aplicados)
      let result = [...trucks];
      if (filters.status !== 'all') {
        result = result.filter(truck => truck.status === filters.status);
      }
      setFilteredTrucks(result);
    }
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setFilters({
      ...filters,
      status: event.target.value as TruckStatus | 'all'
    });
  };

  const handleAddTruck = (newTruck: Truck) => {
    setTrucks(prev => [newTruck, ...prev]);
    setOpenDialog(false);
  };

  const handleEditTruck = (updatedTruck: Truck) => {
    setTrucks(prev => 
      prev.map(truck => truck.id === updatedTruck.id ? updatedTruck : truck)
    );
  };

  const handleDeleteTruck = async (id: number) => {
    try {
      await deleteTruck(id);
      setTrucks(prev => prev.filter(truck => truck.id !== id));
    } catch (err) {
      console.error('Erro ao excluir caminhão:', err);
      setError('Não foi possível excluir o caminhão. Tente novamente mais tarde.');
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} sm={6}>
            <Typography variant="h5" component="h2" gutterBottom>
              Gerenciamento de Caminhões
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cadastre e gerencie sua frota de caminhões
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              Novo Caminhão
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchTrucks}
            >
              Atualizar
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={8}>
            <TruckSearch onSearch={handleSearch} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={filters.status}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Ativos</MenuItem>
                <MenuItem value="inactive">Inativos</MenuItem>
                <MenuItem value="maintenance">Em Manutenção</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredTrucks.length > 0 ? (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Exibindo {filteredTrucks.length} {filteredTrucks.length === 1 ? 'caminhão' : 'caminhões'}
          </Typography>
          
          {filteredTrucks.map(truck => (
            <TruckCard
              key={truck.id}
              truck={truck}
              onEdit={handleEditTruck}
              onDelete={handleDeleteTruck}
            />
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Nenhum caminhão encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery 
              ? 'Tente ajustar os filtros ou termos de busca' 
              : 'Clique em "Novo Caminhão" para adicionar um caminhão à sua frota'}
          </Typography>
        </Paper>
      )}
      
      {/* Diálogo para adicionar novo caminhão */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Adicionar Novo Caminhão</DialogTitle>
        <DialogContent>
          <TruckRegistrationForm onSubmitSuccess={handleAddTruck} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TruckManager;
