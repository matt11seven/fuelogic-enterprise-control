const express = require('express');
const router = express.Router();
const WebhookModel = require('../../models/webhook');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route GET /api/webhooks
 * @desc Retorna todos os webhooks do usuário logado
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const webhooks = await WebhookModel.findAll(req.user.id);
    res.json(webhooks);
  } catch (error) {
    console.error('Erro ao buscar webhooks:', error);
    res.status(500).json({ message: 'Erro ao buscar webhooks', error: error.message });
  }
});

/**
 * @route GET /api/webhooks/:id
 * @desc Retorna um webhook específico
 * @access Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const webhook = await WebhookModel.findById(parseInt(req.params.id), req.user.id);
    
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook não encontrado' });
    }
    
    res.json(webhook);
  } catch (error) {
    console.error(`Erro ao buscar webhook ${req.params.id}:`, error);
    res.status(500).json({ message: 'Erro ao buscar webhook', error: error.message });
  }
});

/**
 * @route GET /api/webhooks/evento/:evento
 * @desc Retorna webhooks para um evento específico
 * @access Private
 */
router.get('/evento/:evento', authenticateToken, async (req, res) => {
  const eventos = ['inspecao', 'pedido']; // Eventos permitidos
  const evento = req.params.evento;
  
  if (!eventos.includes(evento)) {
    return res.status(400).json({ message: 'Evento inválido' });
  }
  
  try {
    const webhooks = await WebhookModel.findByEvento(evento, req.user.id);
    res.json(webhooks);
  } catch (error) {
    console.error(`Erro ao buscar webhooks para o evento ${evento}:`, error);
    res.status(500).json({ message: 'Erro ao buscar webhooks', error: error.message });
  }
});

/**
 * @route GET /api/webhooks/contatos/internos
 * @desc Retorna contatos internos para seleção no SlingFlow
 * @access Private
 */
router.get('/contatos/internos', authenticateToken, async (req, res) => {
  try {
    const contatos = await WebhookModel.getInternalContacts(req.user.id);
    res.json(contatos);
  } catch (error) {
    console.error('Erro ao buscar contatos internos:', error);
    res.status(500).json({ message: 'Erro ao buscar contatos internos', error: error.message });
  }
});

/**
 * @route POST /api/webhooks
 * @desc Cria um novo webhook
 * @access Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Validação básica
    const { type, name, url, integration, selected_contacts } = req.body;
    
    if (!type || !name) {
      return res.status(400).json({ message: 'Tipo e nome são obrigatórios' });
    }
    
    // Validações específicas
    if (integration !== 'generic' && integration !== 'slingflow') {
      return res.status(400).json({ message: 'Tipo de integração inválido' });
    }
    
    if (type !== 'inspection_alert' && type !== 'order_placed' && type !== 'sophia') {
      return res.status(400).json({ message: 'Tipo de evento inválido' });
    }
    
    if (integration === 'generic' && !url) {
      return res.status(400).json({ message: 'URL é obrigatória para webhooks genéricos' });
    }
    
    if (integration === 'slingflow' && (!selected_contacts || Object.keys(selected_contacts).length === 0)) {
      return res.status(400).json({ message: 'É necessário selecionar pelo menos um contato para SlingFlow' });
    }
    
    const webhookData = {
      type,
      name,
      url,
      integration,
      selected_contacts
    };
    
    const webhook = await WebhookModel.create(webhookData, req.user.id);
    res.status(201).json(webhook);
  } catch (error) {
    console.error('Erro ao criar webhook:', error);
    
    if (error.message.includes('apenas contatos internos')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erro ao criar webhook', error: error.message });
  }
});

/**
 * @route PUT /api/webhooks/:id
 * @desc Atualiza um webhook existente
 * @access Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const webhookId = parseInt(req.params.id);
    
    // Verificar se o webhook existe
    const existingWebhook = await WebhookModel.findById(webhookId, req.user.id);
    if (!existingWebhook) {
      return res.status(404).json({ message: 'Webhook não encontrado' });
    }
    
    // Validação básica
    const { type, name, url, integration, selected_contacts } = req.body;
    
    if (!type || !name) {
      return res.status(400).json({ message: 'Tipo e nome são obrigatórios' });
    }
    
    // Validações específicas
    if (integration !== 'generic' && integration !== 'slingflow') {
      return res.status(400).json({ message: 'Tipo de integração inválido' });
    }
    
    if (type !== 'inspection_alert' && type !== 'order_placed' && type !== 'sophia') {
      return res.status(400).json({ message: 'Tipo de evento inválido' });
    }
    
    if (integration === 'generic' && !url) {
      return res.status(400).json({ message: 'URL é obrigatória para webhooks genéricos' });
    }
    
    if (integration === 'slingflow' && (!selected_contacts || Object.keys(selected_contacts).length === 0)) {
      return res.status(400).json({ message: 'É necessário selecionar pelo menos um contato para SlingFlow' });
    }
    
    const webhookData = {
      type,
      name,
      url,
      integration,
      selected_contacts
    };
    
    const webhook = await WebhookModel.update(webhookId, webhookData, req.user.id);
    res.json(webhook);
  } catch (error) {
    console.error(`Erro ao atualizar webhook ${req.params.id}:`, error);
    
    if (error.message.includes('apenas contatos internos')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erro ao atualizar webhook', error: error.message });
  }
});

/**
 * @route DELETE /api/webhooks/:id
 * @desc Remove um webhook (soft delete)
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const webhookId = parseInt(req.params.id);
    
    // Verificar se o webhook existe
    const existingWebhook = await WebhookModel.findById(webhookId, req.user.id);
    if (!existingWebhook) {
      return res.status(404).json({ message: 'Webhook não encontrado' });
    }
    
    const success = await WebhookModel.delete(webhookId, req.user.id);
    
    if (!success) {
      return res.status(400).json({ message: 'Erro ao remover webhook' });
    }
    
    res.json({ message: 'Webhook removido com sucesso' });
  } catch (error) {
    console.error(`Erro ao remover webhook ${req.params.id}:`, error);
    res.status(500).json({ message: 'Erro ao remover webhook', error: error.message });
  }
});

/**
 * @route POST /api/webhooks/:id/test
 * @desc Testa um webhook enviando uma requisição de teste
 * @access Private
 */
router.post('/:id/test', authenticateToken, async (req, res) => {
  try {
    const webhookId = parseInt(req.params.id);
    
    // Verificar se o webhook existe
    const webhook = await WebhookModel.findById(webhookId, req.user.id);
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook não encontrado' });
    }
    
    // Verificar o tipo de integração
    if (webhook.integration === 'generic') {
      // Para integração genérica, faz uma requisição HTTP para a URL
      const axios = require('axios');
      
      if (!webhook.url) {
        return res.status(400).json({ 
          success: false, 
          message: 'Este webhook não possui uma URL configurada' 
        });
      }
      
      try {
        // Preparar dados de teste conforme o tipo de evento
        let testData = {};
        
        if (webhook.type === 'inspection_alert') {
          testData = {
            type: 'inspection_alert',
            test: true,
            inspection: {
              id: 12345,
              vehicle: 'Caminhão ABC-1234',
              status: 'Em andamento',
              date: new Date().toISOString()
            }
          };
        } else if (webhook.type === 'order_placed') {
          testData = {
            type: 'order_placed',
            test: true,
            order: {
              id: 9876,
              customer: 'Cliente Teste',
              value: 1250.00,
              items: 3,
              date: new Date().toISOString()
            }
          };
        } else {
          testData = {
            type: webhook.type,
            test: true,
            message: 'Teste de webhook',
            timestamp: new Date().toISOString()
          };
        }
        
        console.log(`Testando webhook para URL: ${webhook.url} com dados:`, JSON.stringify(testData));
        
        // Fazer requisição POST para a URL do webhook
        const response = await axios.post(webhook.url, testData, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Test': 'true',
            'User-Agent': 'FueLogic-Webhook-Test'
          },
          timeout: 10000, // Timeout de 10 segundos
          validateStatus: function (status) {
            // Aceitar qualquer status para poder mostrar no log
            return true;
          }
        });
        
        console.log(`Resposta do webhook: Status ${response.status}, Body:`, response.data);
        
        // Verificar se o status é de sucesso (2xx)
        if (response.status >= 200 && response.status < 300) {
          return res.json({
            success: true,
            message: `Teste enviado com sucesso. Status: ${response.status}`,
            data: {
              webhook: webhook,
              testData: testData,
              response: {
                status: response.status,
                statusText: response.statusText,
                data: response.data
              }
            }
          });
        } else {
          return res.json({
            success: false,
            message: `Webhook respondeu com erro: Status ${response.status}`,
            data: {
              webhook: webhook,
              testData: testData,
              response: {
                status: response.status,
                statusText: response.statusText,
                data: response.data
              }
            }
          });
        }
      } catch (error) {
        // Erro ao fazer a requisição HTTP
        console.error('Erro ao testar webhook (HTTP request):', error);
        
        return res.status(200).json({
          success: false,
          message: `Erro ao enviar requisição para ${webhook.url}: ${error.message}`,
          error: error.message
        });
      }
    } else if (webhook.integration === 'slingflow') {
      // Para integração SlingFlow, simular o envio para os contatos selecionados
      return res.json({
        success: true,
        message: `Simulação de teste SlingFlow enviada para ${Object.keys(webhook.selected_contacts || {}).length} contatos`,
        data: {
          webhook: webhook,
          contacts: webhook.selected_contacts
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Tipo de integração não suportada: ${webhook.integration}`
      });
    }
  } catch (error) {
    console.error(`Erro ao testar webhook ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno ao testar webhook', 
      error: error.message 
    });
  }
});

module.exports = router;
