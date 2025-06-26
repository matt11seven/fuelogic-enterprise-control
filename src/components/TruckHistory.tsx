import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  Chip, 
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatDate } from '../utils/utils';
import axios from 'axios';

interface TruckHistoryItem {
  id: number;
  truck_id: number;
  user_id: string;
  change_type: 'create' | 'update' | 'delete';
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface TruckHistoryProps {
  truckId: number;
}

const TruckHistory: React.FC<TruckHistoryProps> = ({ truckId }) => {
  const [history, setHistory] = useState<TruckHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Usuário não autenticado');
        }
        
        const response = await axios.get(`/api/trucks/${truckId}/history`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setHistory(response.data);
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
        setError('Não foi possível carregar o histórico de alterações');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [truckId]);

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return <AddCircleOutlineIcon color="success" />;
      case 'update':
        return <EditIcon color="primary" />;
      case 'delete':
        return <DeleteIcon color="error" />;
      default:
        return null;
    }
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return 'Criação';
      case 'update':
        return 'Atualização';
      case 'delete':
        return 'Exclusão';
      default:
        return changeType;
    }
  };

  const getFieldLabel = (fieldName: string) => {
    const fieldLabels: Record<string, string> = {
      name: 'Nome',
      driver_name: 'Motorista',
      license_plate: 'Placa',
      capacity: 'Capacidade',
      observations: 'Observações',
      status: 'Status'
    };
    
    return fieldLabels[fieldName] || fieldName;
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      active: 'Ativo',
      inactive: 'Inativo',
      maintenance: 'Em Manutenção'
    };
    
    return statusLabels[status] || status;
  };

  const formatValue = (fieldName: string, value: string) => {
    if (value === 'null' || value === null) return '-';
    
    if (fieldName === 'status') {
      return getStatusLabel(value);
    }
    
    if (fieldName === 'capacity') {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? value : `${numValue.toLocaleString()} litros`;
    }
    
    return value;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (history.length === 0) {
    return (
      <Alert severity="info">
        Nenhum registro de alteração encontrado para este caminhão.
      </Alert>
    );
  }

  return (
    <Box>
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {history.map((item, index) => (
          <React.Fragment key={item.id}>
            <ListItem alignItems="flex-start">
              <Box sx={{ mr: 2, mt: 1 }}>
                {getChangeTypeIcon(item.change_type)}
              </Box>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Chip 
                      label={getChangeTypeLabel(item.change_type)} 
                      size="small" 
                      color={
                        item.change_type === 'create' ? 'success' : 
                        item.change_type === 'update' ? 'primary' : 'error'
                      }
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="subtitle1" component="span">
                      {formatDate(item.created_at)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    {item.change_type === 'update' && item.field_name ? (
                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Campo:</strong> {getFieldLabel(item.field_name)}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Valor anterior:
                            </Typography>
                            <Typography variant="body2">
                              {formatValue(item.field_name, item.old_value || '')}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Novo valor:
                            </Typography>
                            <Typography variant="body2">
                              {formatValue(item.field_name, item.new_value || '')}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ) : (
                      <Typography variant="body2">
                        {item.change_type === 'create' 
                          ? 'Caminhão cadastrado no sistema.' 
                          : 'Caminhão removido do sistema.'}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
            {index < history.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default TruckHistory;
