import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Typography, FormControl, InputLabel, MenuItem, Select, Chip, Alert, CircularProgress, Grid } from '@mui/material';
import SophiaAPI from '../services/sophia-api';
import webhookApi, { Webhook } from '../services/webhook-api';
import orderApi, { Order as OrderApiType } from '../services/order-api';

interface Order {
  id: number;
  station_id: string;
  tank_id: string;
  product_type: string;
  quantity: number;
  status: string;
  created_at: string;
}

const SophiaWebhookTester: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<number | ''>('');
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        // Buscar webhooks
        const webhooksResponse = await webhookApi.getAllWebhooks();
        const sophiaWebhooks = webhooksResponse.filter(webhook => 
          webhook.integration === 'sophia_ai' || 
          webhook.name.toLowerCase().includes('sophia')
        );
        setWebhooks(sophiaWebhooks);

        // Buscar pedidos pendentes
        const ordersResponse = await orderApi.getOrders({ status: 'pending' });
        const orders = Array.isArray(ordersResponse) ? ordersResponse : [];
        setPendingOrders(orders.map((order: OrderApiType) => ({
          id: order.id || 0,
          station_id: order.station_id,
          tank_id: order.tank_id,
          product_type: order.product_type,
          quantity: order.quantity,
          status: order.status || 'pending',
          created_at: order.created_at || ''
        })));
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Falha ao carregar dados. Verifique a conexão.');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Funções de manipulação
  const handleWebhookChange = (event: any) => {
    setSelectedWebhook(event.target.value as number);
  };

  const handleSendOrders = async () => {
    if (!selectedWebhook) {
      setError('Selecione um Webhook antes de enviar os pedidos.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess({ show: false, message: '' });

    try {
      // Enviar pedidos para o webhook selecionado
      const response = await SophiaAPI.sendOrdersToWebhook(selectedWebhook, pendingOrders);

      if (response.success) {
        setSuccess({ show: true, message: 'Pedidos enviados com sucesso!' });
        setPendingOrders([]); // Limpar os pedidos pendentes após o envio bem-sucedido
      } else {
        setError(`Falha ao enviar pedidos: ${response.message}`);
      }
    } catch (err) {
      console.error('Erro ao enviar pedidos:', err);
      setError('Erro ao enviar pedidos. Verifique a conexão e o Webhook.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPending = async () => {
    setLoading(true);
    setError('');
    setSuccess({ show: false, message: '' });

    try {
      // Simular o processamento dos pedidos pendentes (ex: atualizar status)
      // Aqui você chamaria a API para atualizar o status dos pedidos
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simula uma chamada de API

      setSuccess({ show: true, message: 'Pedidos pendentes processados com sucesso!' });
    } catch (err) {
      console.error('Erro ao processar pedidos pendentes:', err);
      setError('Erro ao processar pedidos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Testador de Webhook Sophia AI
      </Typography>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }}>
          {error}
        </Alert>
      )}

      {success.show && (
        <Alert severity="success" sx={{ marginBottom: 2 }}>
          {success.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Selecionar Webhook
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Webhook Sophia</InputLabel>
                <Select
                  value={selectedWebhook}
                  onChange={handleWebhookChange}
                  label="Webhook Sophia"
                >
                  {webhooks.map((webhook) => (
                    <MenuItem key={webhook.id} value={webhook.id}>
                      {webhook.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pedidos Pendentes
              </Typography>
              <Typography variant="h4" color="primary">
                {pendingOrders.length}
              </Typography>
              <Chip 
                label={`${pendingOrders.length} pedidos`} 
                color="warning" 
                size="small" 
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ações
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={loading || !selectedWebhook}
                  onClick={handleSendOrders}
                >
                  {loading ? <CircularProgress size={20} /> : 'Enviar Pedidos'}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  disabled={loading}
                  onClick={handleProcessPending}
                >
                  Processar Pendentes
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SophiaWebhookTester;
