/**
 * Controlador específico para integração com a IA Sophia
 * Responsável pelos endpoints de processamento e envio de pedidos agrupados
 */
const pool = require('../db');
const sophiaWebhookService = require('../services/sophia-webhook.service');
const logger = require('../utils/logger');

/**
 * Envia pedidos para a IA Sophia agrupados por empresa
 * @route POST /api/sophia/orders/send
 */
async function sendOrdersToSophia(req, res) {
  try {
    const { orderIds, webhookId } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ 
        error: 'É necessário fornecer um array de IDs de pedidos' 
      });
    }
    
    if (!webhookId) {
      return res.status(400).json({ 
        error: 'É necessário fornecer o ID do webhook da Sophia' 
      });
    }
    
    // Buscar os pedidos no banco
    const ordersResult = await pool.query(
      'SELECT * FROM orders WHERE id = ANY($1)',
      [orderIds]
    );
    
    if (ordersResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Nenhum pedido encontrado com os IDs fornecidos' 
      });
    }
    
    // Enviar pedidos para a Sophia
    const result = await sophiaWebhookService.sendGroupedOrdersToSophia(
      ordersResult.rows, 
      webhookId
    );
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao enviar pedidos para Sophia:', error);
    return res.status(500).json({
      error: 'Erro ao processar pedidos para IA Sophia',
      details: error.message
    });
  }
}

/**
 * Processa todos os pedidos pendentes e envia para a IA Sophia
 * @route POST /api/sophia/orders/process-pending/:webhookId
 */
async function processPendingOrdersForSophia(req, res) {
  try {
    const { webhookId } = req.params;
    
    if (!webhookId) {
      return res.status(400).json({ 
        error: 'É necessário fornecer o ID do webhook da Sophia' 
      });
    }
    
    // Processar pedidos pendentes
    const result = await sophiaWebhookService.processPendingOrders(webhookId);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Erro ao processar pedidos pendentes:', error);
    return res.status(500).json({
      error: 'Erro ao processar pedidos pendentes para IA Sophia',
      details: error.message
    });
  }
}

/**
 * Obtém um exemplo do formato do payload da Sophia
 * @route GET /api/sophia/payload-example
 */
async function getSophiaPayloadExample(req, res) {
  try {
    // Exemplo de payload formatado para a Sophia
    const examplePayload = {
      event_id: "sophia_ai_order_example",
      event_type: "sophia_ai_order",
      timestamp: new Date().toISOString(),
      pedido: {
        data_solicitacao: new Date().toISOString(),
        status: "pendente",
        postos: [
          {
            nome: "Posto Exemplo 1 LTDA",
            cnpj: "12.345.678/0001-90",
            endereco: "Av. Brasil, 1500",
            bairro: "Jardim América",
            cidade: "São Paulo",
            estado: "SP",
            cep: "01430-080",
            cliente_gm: "Grupo SLING",
            id_unidade: 765,
            indice_equipamento: 150,
            erp: "SAP",
            pedidos: [
              {
                id: 1,
                tank_id: 15,
                product_type: "Gasolina Comum",
                quantity: 5000,
                scheduled_date: "2025-07-01T10:00:00Z",
                notes: "Entrega prioritária"
              },
              {
                id: 2,
                tank_id: 16,
                product_type: "Gasolina Aditivada",
                quantity: 3000,
                scheduled_date: "2025-07-01T10:00:00Z",
                notes: null
              }
            ],
            totais_por_combustivel: {
              "Gasolina Comum": 5000,
              "Gasolina Aditivada": 3000
            }
          },
          {
            nome: "Auto Posto Central Ltda",
            cnpj: "98.765.432/0001-21",
            endereco: "Rua das Flores, 500",
            cidade: "Rio de Janeiro",
            estado: "RJ",
            pedidos: [
              {
                id: 3,
                tank_id: 22,
                product_type: "Diesel S10",
                quantity: 8000,
                scheduled_date: "2025-07-02T09:30:00Z",
                notes: null
              }
            ],
            totais_por_combustivel: {
              "Diesel S10": 8000
            }
          }
        ],
        resumo_geral: {
          total_postos: 2,
          total_pedidos: 3,
          totais_combustiveis: {
            "Gasolina Comum": 5000,
            "Gasolina Aditivada": 3000,
            "Diesel S10": 8000
          },
          quantidade_total: 16000,
          valor_total: 88000.00,
          data_entrega_estimada: "2025-07-02T09:30:00Z"
        }
      },
      metadata: {
        source: "Fuelogic Enterprise",
        version: "1.0",
        gerado_por: "Sistema de Pedidos Automatizados",
        interface: "Webhook Sophia AI"
      }
    };
    
    return res.status(200).json(examplePayload);
  } catch (error) {
    logger.error('Erro ao gerar exemplo de payload:', error);
    return res.status(500).json({
      error: 'Erro ao gerar exemplo de payload',
      details: error.message
    });
  }
}

module.exports = {
  sendOrdersToSophia,
  processPendingOrdersForSophia,
  getSophiaPayloadExample
};
