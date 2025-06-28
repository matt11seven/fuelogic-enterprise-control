import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Button,
  Stack,
  Typography,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { Truck, TruckStatus } from '../types/truck';
import { updateTruck } from '../services/truck-api';
import { isValidBrazilianLicensePlate } from '../lib/utils';

interface TruckInlineEditProps {
  truck: Truck;
  onSave: (updatedTruck: Truck) => void;
  onCancel: () => void;
}

const TruckInlineEdit: React.FC<TruckInlineEditProps> = ({ truck, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: truck.name,
    driver_name: truck.driver_name,
    license_plate: truck.license_plate,
    capacity: truck.capacity,
    observations: truck.observations || '',
    status: truck.status
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!formData.driver_name.trim()) {
      newErrors.driver_name = 'Nome do motorista é obrigatório';
    }
    
    if (!formData.license_plate.trim()) {
      newErrors.license_plate = 'Placa é obrigatória';
    } else if (!isValidBrazilianLicensePlate(formData.license_plate)) {
      newErrors.license_plate = 'Placa inválida';
    }
    
    if (!formData.capacity || formData.capacity <= 0) {
      newErrors.capacity = 'Capacidade deve ser maior que zero';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler para TextField
  const handleTextFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Limpar erro do campo quando o usuário digita
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  // Handler para Select
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    
    if (!validate()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updatedTruck = await updateTruck(truck.id, {
        ...formData,
        capacity: Number(formData.capacity)
      });
      
      onSave(updatedTruck);
    } catch (error) {
      console.error('Erro ao atualizar caminhão:', error);
      setApiError(error instanceof Error ? error.message : 'Erro ao atualizar caminhão');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Edição rápida
      </Typography>
      
      {apiError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {apiError}
        </Alert>
      )}
      
      <Stack spacing={2}>
        <TextField
          name="name"
          label="Nome do Caminhão"
          value={formData.name}
          onChange={handleTextFieldChange}
          fullWidth
          size="small"
          error={!!errors.name}
          helperText={errors.name}
          disabled={isSubmitting}
        />
        
        <TextField
          name="driver_name"
          label="Nome do Motorista"
          value={formData.driver_name}
          onChange={handleTextFieldChange}
          fullWidth
          size="small"
          error={!!errors.driver_name}
          helperText={errors.driver_name}
          disabled={isSubmitting}
        />
        
        <TextField
          name="license_plate"
          label="Placa"
          value={formData.license_plate}
          onChange={handleTextFieldChange}
          fullWidth
          size="small"
          error={!!errors.license_plate}
          helperText={errors.license_plate}
          disabled={isSubmitting}
        />
        
        <TextField
          name="capacity"
          label="Capacidade (litros)"
          type="number"
          value={formData.capacity}
          onChange={handleTextFieldChange}
          fullWidth
          size="small"
          error={!!errors.capacity}
          helperText={errors.capacity}
          disabled={isSubmitting}
          InputProps={{ inputProps: { min: 1 } }}
        />
        
        <FormControl fullWidth size="small">
          <InputLabel>Status</InputLabel>
          <Select
            name="status"
            value={formData.status}
            label="Status"
            onChange={handleSelectChange}
            disabled={isSubmitting}
          >
            <MenuItem value="active">Ativo</MenuItem>
            <MenuItem value="inactive">Inativo</MenuItem>
            <MenuItem value="maintenance">Em Manutenção</MenuItem>
          </Select>
        </FormControl>
        
        <TextField
          name="observations"
          label="Observações"
          value={formData.observations}
          onChange={handleTextFieldChange}
          fullWidth
          size="small"
          multiline
          rows={2}
          disabled={isSubmitting}
        />
        
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={isSubmitting}
          >
            Salvar
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default TruckInlineEdit;
