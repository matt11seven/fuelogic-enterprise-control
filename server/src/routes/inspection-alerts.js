const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Webhook = require('../../models/webhook');

// Enviar alerta de inspeção para todos os webhooks configurados do tipo 'inspection_alert'
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { tankData } = req.body;
    
    if (!tankData || !Array.isArray(tankData) || tankData.length === 0) {
      return res.status(400).json({ error: 'Dados de tanque inválidos ou não fornecidos' });
    }

    // Filtrar apenas tanques com água (quantidade > 0)
    const tanquesComAgua = tankData.filter(tanque => 
      tanque.QuantidadeDeAgua && tanque.QuantidadeDeAgua > 0
    );
    
    if (tanquesComAgua.length === 0) {
      return res.status(400).json({ error: 'Nenhum tanque com água detectada' });
    }
    
    // Buscar todos os webhooks do tipo 'inspection_alert'
    const webhooks = await Webhook.getByType('inspection_alert');
    
    if (!webhooks || webhooks.length === 0) {
      return res.status(404).json({ error: 'Nenhum webhook de alerta de inspeção configurado' });
    }
    
    const resultados = [];
    
    // Para cada webhook, enviar a notificação
    for (const webhook of webhooks) {
      // Preparar os dados de alerta específicos para este webhook
      const payload = {
        inspection: {
          id: Math.floor(Math.random() * 10000) + 1000,
          report_id: `INS-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          inspector: "Sistema de Monitoramento FueLogic",
          description: `Foi detectada água em ${tanquesComAgua.length} tanque(s) que requerem atenção imediata`,
          severity: "high",
          alerta_tipo: "agua_no_tanque",
          alertas: tanquesComAgua.map(tanque => ({
            cliente: tanque.Cliente,
            unidade: tanque.Unidade,
            tanque: tanque.Tanque,
            produto: tanque.Produto,
            quantidade_agua: tanque.QuantidadeDeAgua.toFixed(1) + 'L',
            data_medicao: new Date(tanque.DataMedicao).toLocaleDateString('pt-BR')
          }))
        }
      };
      
      // Log para depuração (apenas em ambiente de desenvolvimento)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Enviando alerta para webhook ${webhook.id} - ${webhook.name}:`);
        console.log(JSON.stringify(payload, null, 2));
      }
      
      try {
        // Enviar requisição POST para o URL do webhook
        const axios = require('axios');
        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        resultados.push({
          webhook_id: webhook.id,
          name: webhook.name,
          success: true,
          status: response.status,
          data: response.data
        });
      } catch (error) {
        resultados.push({
          webhook_id: webhook.id,
          name: webhook.name,
          success: false,
          error: error.message
        });
        
        // Log detalhado do erro (apenas em ambiente de desenvolvimento)
        if (process.env.NODE_ENV !== 'production') {
          console.error(`Erro ao enviar alerta para webhook ${webhook.id}:`, error);
        }
      }
    }
    
    // Retornar os resultados das entregas
    return res.json({
      success: true,
      message: `Alertas enviados para ${resultados.filter(r => r.success).length} de ${resultados.length} webhooks configurados`,
      resultados
    });
    
  } catch (error) {
    console.error('Erro ao processar alerta de inspeção:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
