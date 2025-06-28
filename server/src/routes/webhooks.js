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
    if (integration !== 'generic' && integration !== 'slingflow' && integration !== 'sophia_ai') {
      return res.status(400).json({ message: 'Tipo de integração inválido' });
    }
    
    if (type !== 'inspection_alert' && type !== 'order_placed' && type !== 'sophia' && type !== 'sophia_ai_order') {
      return res.status(400).json({ message: 'Tipo de evento inválido' });
    }
    
    if (integration === 'generic' && !url) {
      return res.status(400).json({ message: 'URL é obrigatória para webhooks genéricos' });
    }
    
    if (integration === 'slingflow' && (!selected_contacts || Object.keys(selected_contacts).length === 0)) {
      return res.status(400).json({ message: 'É necessário selecionar pelo menos um contato para SlingFlow' });
    }
    

    if (integration === 'sophia_ai' && !url) {
      return res.status(400).json({ message: 'URL é obrigatória para webhooks da IA Sophia' });
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
  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = process.env.NODE_ENV !== 'production';
  try {
    const webhookId = parseInt(req.params.id);
    
    // Verificar se o webhook existe
    const webhook = await WebhookModel.findById(webhookId, req.user.id);
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook não encontrado' });
    }
    
    // Verificar o tipo de integração
    if (webhook.integration === 'generic' || webhook.integration === 'sophia_ai') {
      // Para integração genérica, faz uma requisição HTTP para a URL
      const axios = require('axios');
      
      if (!webhook.url) {
        if (isDevelopment) console.log('ERRO: Webhook não possui URL configurada');
        return res.status(400).json({ 
          success: false, 
          message: 'Este webhook não possui uma URL configurada' 
        });
      }
      
      try {
        // Preparar dados de teste apropriados com base no tipo de webhook
        let testData = {
          eventType: webhook.type,
          test: true,
          timestamp: new Date().toISOString()
        };

        // Adicionar dados específicos com base no tipo do webhook
        if (webhook.type === 'inspection_alert') {
          testData.inspection = {
            id: Math.floor(Math.random() * 10000) + 1000,
            report_id: `INS-${Math.floor(Math.random() * 1000)}`,
            truck_id: Math.floor(Math.random() * 100) + 1,
            truck_plate: `ABC-${Math.floor(Math.random() * 10000)}`,
            status: "requires_attention",
            severity: "high",
            description: "Teste de alerta de inspeção: Foi detectado um problema que requer atenção imediata",
            issues: [
              {
                component: "tanque",
                description: "Vazamento detectado",
                action_required: "Inspeção visual e reparo necessário"
              },
              {
                component: "válvula",
                description: "Pressão irregular",
                action_required: "Calibragem necessária"
              }
            ],
            inspector: "Técnico de Teste",
            created_at: new Date().toISOString(),
            due_date: new Date(Date.now() + 86400000).toISOString() // 24 horas à frente
          };
        } else if (webhook.type === 'order_placed') {
          // Gerar um número de pedido aleatório com formato específico
          const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          
          testData.order = {
            id: Math.floor(Math.random() * 10000) + 1000,
            order_number: orderNumber,
            customer: {
              id: Math.floor(Math.random() * 1000) + 100,
              name: "Empresa de Teste LTDA",
              contact: "Contato de Teste",
              phone: "+55 11 9999-8888"
            },
            items: [
              {
                id: 1,
                product: "Gás GLP",
                quantity: 3,
                unit_price: 250.00,
                total: 750.00
              },
              {
                id: 2,
                product: "Transporte Especializado",
                quantity: 1,
                unit_price: 350.00,
                total: 350.00
              },
              {
                id: 3,
                product: "Taxa de Entrega Expressa",
                quantity: 1,
                unit_price: 150.00,
                total: 150.00
              }
            ],
            delivery_address: "Av. Teste, 1000 - São Paulo/SP",
            delivery_date: new Date(Date.now() + 172800000).toISOString(), // 48 horas à frente
            total: 1250.00,
            status: "pending",
            payment_method: "Faturamento 30 dias",
            created_at: new Date().toISOString()
          };
        } else {
          testData = {
            type: webhook.type,
            test: true,
            message: 'Teste de webhook',
            timestamp: new Date().toISOString()
          };
        }
        
        if (isDevelopment) {
          console.log('=== TESTE DE WEBHOOK (DETALHADO) ===');
          console.log(`URL: ${webhook.url}`);
          console.log('Headers:', {
            'Content-Type': 'application/json',
            'X-Webhook-Test': 'true',
            'User-Agent': 'FueLogic-Webhook-Test'
          });
          console.log('Payload:', JSON.stringify(testData, null, 2));
        }
        
        // Fazer requisição POST para a URL do webhook com detecção de erro
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
        
        if (isDevelopment) {
          console.log('=== RESPOSTA DO WEBHOOK ===');
          console.log(`Status: ${response.status} ${response.statusText}`);
          console.log('Headers:', response.headers);
          console.log('Body:', response.data);
          console.log('=== FIM DA RESPOSTA ===');
        }
        
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
        if (isDevelopment) {
          console.error('=== ERRO AO TESTAR WEBHOOK ===');
          console.error(`URL: ${webhook.url}`);
          console.error(`Erro: ${error.code || error.message}`);
          if (error.request) console.error('Request foi enviado mas não houve resposta');
          if (error.response) console.error('Status:', error.response.status, 'Data:', error.response.data);
          console.error('=== FIM DO ERRO ===');
        } else {
          console.error('Erro ao testar webhook:', error.message);
        }
        
        return res.status(200).json({
          success: false,
          message: `Erro ao enviar requisição para ${webhook.url}: ${error.message}`,
          error: error.message
        });
      }
    } else if (webhook.integration === 'slingflow') {
      // Para integração SlingFlow, enviar requisição POST real (não mais simulação)
      try {
        const axios = require('axios');
        
        if (!webhook.url) {
          if (isDevelopment) console.log('ERRO: Webhook SlingFlow não possui URL configurada');
          return res.status(400).json({ 
            success: false, 
            message: 'Este webhook SlingFlow não possui uma URL configurada' 
          });
        }

        // Preparar dados para envio
        const contactIds = Object.keys(webhook.selected_contacts || {});
        
        // Buscar informações detalhadas dos contatos no banco de dados
        const db = require('../db');
        let contactDetails = [];
        
        try {
          // Consultar detalhes dos contatos selecionados
          const contactsQuery = await db.query(
            `SELECT id, nome, telefone, email, tipo FROM contatos WHERE id = ANY($1::int[]) AND deleted_at IS NULL`, 
            [contactIds]
          );
          
          contactDetails = contactsQuery.rows;
          
          if (isDevelopment) {
            console.log(`Detalhes dos contatos encontrados: ${JSON.stringify(contactDetails)}`);
          }
        } catch (dbError) {
          console.error('Erro ao buscar detalhes dos contatos:', dbError);
          // Continuar mesmo sem os detalhes dos contatos
          contactDetails = contactIds.map(id => ({ id: parseInt(id), nome: `Contato ID ${id}` }));
        }
        
        // Preparar dados específicos com base no tipo do webhook
        let eventSpecificData = {};
        
        if (webhook.type === 'inspection_alert') {
          // Criar dados de teste baseados no formato real dos tanques
          // Incluir apenas tanques com água para alertas de inspeção
          const tanquesComAlerta = [
            {
              "Id": 12345,
              "Cliente": "REDE SLING",
              "Unidade": "POSTO SLING 2",
              "Tanque": 6,
              "Produto": "GASOLINA GRID",
              "QuantidadeAtual": 5791.71533203125,
              "QuantidadeAtualEmMetrosCubicos": 0,
              "QuantidadeDeAgua": 29.647270202636719, // Tanque com água
              "QuantidadeVazia": 9835.951171875,
              "Temperatura": 31.811862945556641,
              "DataMedicao": new Date().toISOString(),
              "DataRecebimento": new Date().toISOString(),
              "IndiceDoEquipamento": 153,
              "NumeroDoTanque": 6,
              "CapacidadeDoTanque": 15627.66650390625,
              "CapacidadeDoTanqueMenos10Porcento": 14064.899853515624,
              "NivelEmPercentual": 37.06065349285236,
              "NivelEmPercentualComTolerancia": 41.178503880947069,
              "IdUnidade": 776
            },
            {
              "Id": 12345,
              "Cliente": "REDE SLING",
              "Unidade": "POSTO SLING 3",
              "Tanque": 1,
              "Produto": "GASOLINA COMUM",
              "QuantidadeAtual": 9424.650390625,
              "QuantidadeAtualEmMetrosCubicos": 0,
              "QuantidadeDeAgua": 25.114055633544918, // Tanque com água
              "QuantidadeVazia": 5895.35009765625,
              "Temperatura": 28.753679275512695,
              "DataMedicao": new Date().toISOString(),
              "DataRecebimento": new Date().toISOString(),
              "IndiceDoEquipamento": 154,
              "NumeroDoTanque": 1,
              "CapacidadeDoTanque": 15320.00048828125,
              "CapacidadeDoTanqueMenos10Porcento": 13788.000439453124,
              "NivelEmPercentual": 61.518603722200993,
              "NivelEmPercentualComTolerancia": 68.3540041357789,
              "IdUnidade": 781
            }
          ];
          
          eventSpecificData = {
            inspection: {
              id: Math.floor(Math.random() * 10000) + 1000,
              report_id: `INS-${Math.floor(Math.random() * 1000)}`,
              timestamp: new Date().toISOString(),
              inspector: "Sistema de Monitoramento FueLogic",
              description: "Foi detectada água em 2 tanques que requerem atenção imediata",
              severity: "high",
              alerta_tipo: "agua_no_tanque",
              // Incluir apenas tanques com quantidade de água maior que zero e apenas os campos solicitados
              alertas: tanquesComAlerta.map(tanque => ({
                cliente: tanque.Cliente,
                unidade: tanque.Unidade,
                tanque: tanque.Tanque,
                produto: tanque.Produto,
                quantidade_agua: tanque.QuantidadeDeAgua.toFixed(1) + 'L',
                data_medicao: new Date(tanque.DataMedicao).toLocaleDateString('pt-BR')
              }))
            }
          };
        } else if (webhook.type === 'order_placed') {
          const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          
          eventSpecificData = {
            order: {
              id: Math.floor(Math.random() * 10000) + 1000,
              order_number: orderNumber,
              customer: {
                id: Math.floor(Math.random() * 1000) + 100,
                name: "Empresa de Teste LTDA"
              },
              total: 1250.00,
              status: "pending",
              created_at: new Date().toISOString()
            }
          };
        }
        
        const testData = {
          eventType: webhook.type,
          integration: 'slingflow',
          test: true,
          timestamp: new Date().toISOString(),
          contacts: contactDetails,
          message: `Este é um teste de notificação SlingFlow para o evento ${webhook.type}`,
          details: {
            source: "FueLogic Enterprise",
            webhook_id: webhook.id,
            webhook_name: webhook.name
          },
          ...eventSpecificData
        };
        
        if (isDevelopment) {
          console.log('=== TESTE DE WEBHOOK SLINGFLOW (ENVIO REAL) ===');
          console.log(`URL: ${webhook.url}`);
          console.log(`Tipo: ${webhook.type}`);
          console.log('Contatos selecionados:', webhook.selected_contacts);
          console.log('Payload:', JSON.stringify(testData, null, 2));
          console.log('=== INICIANDO ENVIO REAL SLINGFLOW ===');
        }
        
        // Para SlingFlow, vamos enviar individualmente para cada contato
        let allResponses = [];
        let successCount = 0;
        let failCount = 0;
        
        // Verificar se temos contatos para enviar
        if (contactDetails.length === 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'Este webhook SlingFlow não possui contatos selecionados válidos' 
          });
        }
        
        // Enviar para cada contato individualmente
        if (isDevelopment) console.log(`Enviando para ${contactDetails.length} contatos individualmente...`);
        
        for (const contact of contactDetails) {
          try {
            if (!contact.telefone) {
              if (isDevelopment) console.log(`Contato ID ${contact.id} não possui telefone. Pulando...`);
              continue; // Pular contatos sem telefone
            }
            
            // Criar payload específico para este contato
            const contactTestData = {
              ...testData,
              contacts: [contact], // Apenas um único contato por vez
              recipient: {
                id: contact.id,
                name: contact.nome,
                phone: contact.telefone,
                type: contact.tipo
              },
            };
            
            if (isDevelopment) {
              console.log(`=== ENVIANDO PARA CONTATO ${contact.id}: ${contact.nome} ===`);
              console.log(`Telefone: ${contact.telefone}`);
              console.log(`URL: ${webhook.url}`);
            }
            
            // Fazer requisição POST real para a URL do webhook SlingFlow
            const contactResponse = await axios.post(webhook.url, contactTestData, {
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Test': 'true',
                'User-Agent': 'FueLogic-Webhook-Test',
                'X-Contact-Phone': contact.telefone // Incluir telefone do contato nos headers também
              },
              // Função para aceitar qualquer status HTTP como válido (não lançar erro)
              validateStatus: function(status) {
                return true; // Aceitar qualquer status HTTP
              },
              // Timeout de 10 segundos
              timeout: 10000
            });
            
            allResponses.push({
              contact: contact,
              status: contactResponse.status,
              success: contactResponse.status >= 200 && contactResponse.status < 300,
              data: contactResponse.data
            });
            
            if (contactResponse.status >= 200 && contactResponse.status < 300) {
              successCount++;
              if (isDevelopment) console.log(`Sucesso para contato ${contact.id} - Status: ${contactResponse.status}`);
            } else {
              failCount++;
              if (isDevelopment) console.log(`Falha para contato ${contact.id} - Status: ${contactResponse.status}`);
            }
          } catch (contactError) {
            if (isDevelopment) {
              console.error(`Erro ao enviar para contato ${contact.id}: ${contactError.message}`);
            }
            
            allResponses.push({
              contact: contact,
              success: false,
              error: contactError.message
            });
            
            failCount++;
          }
        }
        
        // Gerar uma resposta consolidada
        const response = {
          status: successCount > 0 ? 200 : 500,
          data: {
            success_count: successCount,
            fail_count: failCount,
            detail: allResponses
          }
        };
        
        if (isDevelopment) {
          console.log('=== RESPOSTA DO WEBHOOK SLINGFLOW ===');
          console.log(`Status: ${response.status} ${response.statusText}`);
          console.log('Headers:', response.headers);
          console.log('Body:', response.data);
          console.log('=== FIM DA RESPOSTA SLINGFLOW ===');
        }
        
        // Verificar se o status é de sucesso (2xx)
        // Analisar os resultados individuais
        if (successCount > 0) {
          return res.json({
            success: true,
            message: `Teste SlingFlow enviado com sucesso para ${successCount}/${contactDetails.length} contatos`,
            data: {
              webhook: webhook,
              success_count: successCount,
              fail_count: failCount,
              detail: allResponses
            }
          });
        } else {
          return res.json({
            success: false,
            message: `Webhook SlingFlow falhou para todos os ${contactDetails.length} contatos`,
            data: {
              webhook: webhook,
              success_count: 0,
              fail_count: failCount,
              detail: allResponses
            }
          });
        }
      } catch (error) {
        // Erro ao fazer a requisição HTTP para SlingFlow
        if (isDevelopment) {
          console.error('=== ERRO AO TESTAR WEBHOOK SLINGFLOW ===');
          console.error(`URL: ${webhook.url}`);
          console.error(`Erro: ${error.code || error.message}`);
          if (error.request) console.error('Request foi enviado mas não houve resposta');
          if (error.response) console.error('Status:', error.response.status, 'Data:', error.response.data);
          console.error('=== FIM DO ERRO SLINGFLOW ===');
        } else {
          console.error('Erro ao testar webhook SlingFlow:', error.message);
        }
        
        return res.status(200).json({
          success: false,
          message: `Erro ao enviar requisição para ${webhook.url}: ${error.message}`,
          error: error.message
        });
      }
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
