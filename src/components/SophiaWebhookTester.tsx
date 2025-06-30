
import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Typography, FormControl, InputLabel, MenuItem, Select, Chip, Alert, CircularProgress, Grid } from '@mui/material';
import SophiaAPI from '../services/sophia-api';
import webhookApi, { Webhook } from '../services/webhook-api';
import orderApi from '../services/order-api';

interface Order {
  id: number;
  station_id: number;
  tank_id: number;
  product_type: string;
  quantity: number;
  status: string;
  station_name?: string;
}

/**
 * Componente para testar a integração com a IA Sophia
 * Permite enviar pedidos selecionados ou todos os pendentes para a IA Sophia
 */
const SophiaWebhookTester: React.FC = () => {
  // Estados
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<number | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carregar webhooks e pedidos ao montar o componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Buscar webhooks
        const webhooksResponse = await webhookApi.getAllWebhooks();
        const sophiaWebhooks = webhooksResponse.filter(webhook => 
          webhook.integration === 'sophia_ai' || 
          webhook.name.toLowerCase().includes('sophia')
        );
        setWebhooks(sophiaWebhooks);

        // Buscar pedidos pendentes
        const ordersResponse = await orderApi.getOrders({ status: 'pending' });
        setPendingOrders(Array.isArray(ordersResponse) ? ordersResponse : []);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Falha ao carregar webhooks e pedidos.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Funções de manipulação
  const handleWebhookChange = (event: any) => {
    setSelectedWebhook(event.target.value as number);
  };

  const handleOrderSelect = (orderId: number) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === pendingOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map(order => order.id));
    }
  };

  // Enviar pedidos selecionados para a IA Sophia
  const handleSendSelectedOrders = async () => {
    if (!selectedWebhook || selectedOrders.length === 0) {
      setError('Selecione um webhook e pelo menos um pedido.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await SophiaAPI.sendOrdersToSophia(selectedOrders, selectedWebhook);
      
      setResult({
        success: response.success,
        message: `${response.message} Detalhes: ${response.details?.pedidos || 0} pedidos de ${response.details?.empresas || 0} empresas processados.`
      });
      setLoading(false);
    } catch (err: any) {
      console.error('Erro ao enviar pedidos para Sophia:', err);
      setError(err.message || 'Falha ao enviar pedidos para IA Sophia.');
      setLoading(false);
    }
  };

  // Processar todos os pedidos pendentes
  const handleProcessAllPending = async () => {
    if (!selectedWebhook) {
      setError('Selecione um webhook para processar pedidos pendentes.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await SophiaAPI.processPendingOrders(selectedWebhook);
      
      setResult({
        success: response.success,
        message: response.message
      });
      setLoading(false);
    } catch (err: any) {
      console.error('Erro ao processar pedidos pendentes:', err);
      setError(err.message || 'Falha ao processar pedidos pendentes.');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Integração com IA Sophia
      </Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sobre a integração
          </Typography>
          <Typography variant="body1" paragraph>
            Este componente permite enviar pedidos para a IA Sophia em um formato especial:
            pedidos agrupados por empresa, com resumo de totais por tipo de combustível.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            A Sophia receberá os dados formatados conforme especificação e processará os pedidos
            de forma inteligente para otimizar entregas.
          </Typography>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Alert severity={result.success ? "success" : "warning"} sx={{ mb: 2 }}>
          {result.message}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="webhook-select-label">Webhook da Sophia</InputLabel>
        <Select
          labelId="webhook-select-label"
          id="webhook-select"
          value={selectedWebhook || ''}
          label="Webhook da Sophia"
          onChange={handleWebhookChange}
          disabled={loading}
        >
          {webhooks.length === 0 ? (
            <MenuItem value="" disabled>
              Nenhum webhook da Sophia encontrado
            </MenuItem>
          ) : (
            webhooks.map((webhook) => (
              <MenuItem key={webhook.id} value={webhook.id}>
                {webhook.name} ({webhook.url})
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Pedidos Pendentes
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Button 
            variant="outlined" 
            onClick={handleSelectAll}
            disabled={loading || pendingOrders.length === 0}
          >
            {selectedOrders.length === pendingOrders.length 
              ? 'Desmarcar Todos' 
              : 'Selecionar Todos'}
          </Button>
          <Box>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSendSelectedOrders}
              disabled={loading || selectedOrders.length === 0 || !selectedWebhook}
              sx={{ mr: 1 }}
            >
              Enviar Selecionados
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleProcessAllPending}
              disabled={loading || !selectedWebhook}
            >
              Processar Pendentes
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : pendingOrders.length === 0 ? (
          <Alert severity="info">Nenhum pedido pendente encontrado.</Alert>
        ) : (
          <Grid container spacing={2}>
            {pendingOrders.map((order) => (
              <Grid item xs={12} sm={6} md={4} key={order.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedOrders.includes(order.id) ? '2px solid #1976d2' : 'none'
                  }}
                  onClick={() => handleOrderSelect(order.id)}
                >
                  <CardContent>
                    <Typography variant="subtitle1">
                      Pedido #{order.id}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Posto ID: {order.station_id}
                    </Typography>
                    <Typography variant="body2">
                      {order.product_type}: {order.quantity} litros
                    </Typography>
                    <Chip 
                      label={order.status} 
                      color={order.status === 'pending' ? 'warning' : 'success'} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default SophiaWebhookTester;
