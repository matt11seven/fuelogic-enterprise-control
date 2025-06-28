import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  IconButton, 
  Collapse, 
  Grid,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HistoryIcon from '@mui/icons-material/History';
import { Truck } from '../types/truck';
import TruckStatusBadge from './trucks/TruckStatusBadge';
import { formatDate } from '../lib/utils';
import TruckInlineEdit from './TruckInlineEdit';
import TruckHistory from './TruckHistory';

interface TruckCardProps {
  truck: Truck;
  onEdit: (truck: Truck) => void;
  onDelete: (id: number) => void;
}

const TruckCard: React.FC<TruckCardProps> = ({ truck, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = (updatedTruck: Truck) => {
    onEdit(updatedTruck);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    onDelete(truck.id);
    setShowDeleteDialog(false);
  };

  const handleHistoryClick = () => {
    setShowHistoryDialog(true);
  };

  return (
    <>
      {isEditing ? (
        <TruckInlineEdit 
          truck={truck} 
          onSave={handleSaveEdit} 
          onCancel={handleCancelEdit} 
        />
      ) : (
        <Card 
          sx={{ 
            mb: 2, 
            position: 'relative',
            transition: 'all 0.3s',
            '&:hover': {
              boxShadow: 3,
            }
          }}
        >
          <CardContent sx={{ pb: 1 }}>
            <Grid container alignItems="center" spacing={1}>
              <Grid item xs={7} sm={8}>
                <Typography variant="h6" component="div" noWrap>
                  {truck.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  Motorista: {truck.driver_name}
                </Typography>
              </Grid>
              
              <Grid item xs={5} sm={4} sx={{ textAlign: 'right' }}>
                <TruckStatusBadge status={truck.status} />
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {truck.license_plate}
                </Typography>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Capacidade: {truck.capacity.toLocaleString()} litros
              </Typography>
              
              <Box>
                <IconButton 
                  size="small" 
                  onClick={handleHistoryClick}
                  title="Ver histórico"
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={handleEditClick}
                  title="Editar"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={handleDeleteClick}
                  title="Excluir"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={handleExpandClick}
                  title={expanded ? "Recolher detalhes" : "Expandir detalhes"}
                >
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            </Box>
            
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ my: 1 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Criado em:</strong> {formatDate(truck.created_at)}
                    </Typography>
                    
                    {truck.updated_at && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Atualizado em:</strong> {formatDate(truck.updated_at)}
                      </Typography>
                    )}
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Observações:</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {truck.observations || "Nenhuma observação registrada."}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      )}
      
      {/* Diálogo de confirmação de exclusão */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir o caminhão "{truck.name}" ({truck.license_plate})?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de histórico */}
      <Dialog
        open={showHistoryDialog}
        onClose={() => setShowHistoryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Histórico de Alterações</DialogTitle>
        <DialogContent>
          <TruckHistory truckId={truck.id} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistoryDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TruckCard;
