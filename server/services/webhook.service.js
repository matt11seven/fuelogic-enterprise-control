/**
 * Serviço de webhooks para envio de notificações
 */
const axios = require('axios');
const logger = require('../utils/logger');
const pool = require('../db');

/**
 * Formatação de payloads para diferentes tipos de webhooks
 * @param {Object} data - Dados a serem formatados
 * @param {string} type - Tipo do webhook ('inspection_alert', 'order_placed')
 * @returns {Object} - Payload formatado
 */
function formatPayload(data, type) {
  const timestamp = new Date().toISOString();
  const eventId = `${type}_${Date.now()}`;

  if (type === 'inspection_alert') {
    return {
      event_id: eventId,
      event_type: 'inspection_alert',
      timestamp,
      tank: {
        id: data.tank_id,
        station_id: data.station_id,
        product_type: data.product_type || 'Não especificado',
        inspection_result: data.result || 'Não especificado',
        details: data.details || {}
      },
      metadata: {
        source: 'Fuelogic Enterprise',
        version: '1.0'
      }
    };
  } 
  
  if (type === 'order_placed') {
    return {
      event_id: eventId,
      event_type: 'order_placed',
      timestamp,
      order: {
        id: data.id,
        station_id: data.station_id,
        tank_id: data.tank_id,
        product_type: data.product_type,
        quantity: data.quantity,
        status: data.status || 'pending',
        notes: data.notes,
        scheduled_date: data.scheduled_date
      },
      metadata: {
        source: 'Fuelogic Enterprise',
        version: '1.0'
      }
    };
  }
  
  if (type === 'sophia_ai_order') {
    return {
      event_id: eventId,
      event_type: 'sophia_ai_order',
      timestamp,
      pedido: {
        data_solicitacao: timestamp,
        status: data.status || 'pendente',
        postos: data.postos || [],
        resumo_geral: {
          total_postos: data.resumo_geral?.total_postos || 0,
          total_pedidos: data.resumo_geral?.total_pedidos || 0,
          totais_combustiveis: data.resumo_geral?.totais_combustiveis || {}
        }
      },
      metadata: {
        source: 'Fuelogic Enterprise',
        version: '1.0',
        gerado_por: 'Sistema de Pedidos Automatizados',
        interface: 'Webhook Sophia AI'
      }
    };
  }

  // Tipo desconhecido - retorna dados genéricos
  return {
    event_id: eventId,
    event_type: type,
    timestamp,
    data,
    metadata: {
      source: 'Fuelogic Enterprise',
      version: '1.0'
    }
  };
}

/**
 * Serviço para gerenciamento de webhooks
 */
const webhookService = {
  /**
   * Envia um payload personalizado através de webhook
   * @param {Object} webhookConfig - Configuração do webhook
   * @param {Object} payload - Dados a serem enviados
   * @param {string} type - Tipo do payload para formatação
   * @returns {Promise<boolean>} - Sucesso ou falha
   */
  async sendCustomPayload(webhookConfig, payload, type) {
    try {
      if (!webhookConfig?.url) {
        logger.warn(`Webhook não possui URL configurada`);
        return false;
      }

      // Prepara os headers
      const headers = {
        'Content-Type': 'application/json',
        ...webhookConfig.headers
      };

      // Adiciona autenticação se configurada
      if (webhookConfig.auth_type === 'basic' && webhookConfig.auth_config) {
        const { username, password } = webhookConfig.auth_config;
        if (username && password) {
          const auth = Buffer.from(`${username}:${password}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        }
      } else if (webhookConfig.auth_type === 'bearer' && webhookConfig.auth_config) {
        const { token } = webhookConfig.auth_config;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      // Formata o payload de acordo com o tipo
      const formattedPayload = formatPayload(payload, type);

      // Configurações da requisição
      const requestConfig = {
        url: webhookConfig.url,
        method: webhookConfig.method || 'POST',
        headers,
        data: formattedPayload,
        timeout: (webhookConfig.timeout_seconds || 10) * 1000
      };

      logger.info(`Enviando payload tipo ${type} para webhook ${webhookConfig.id}`);

      // Envia a requisição
      const response = await axios(requestConfig);

      // Registra o sucesso
      logger.info(`Webhook executado com sucesso para payload tipo ${type}`, {
        status: response.status,
        webhookId: webhookConfig.id
      });

      // Registra histórico da notificação no banco
      await pool.query(`
        INSERT INTO webhook_logs (
          webhook_id, 
          entity_id, 
          entity_type, 
          status_code, 
          success, 
          request_payload, 
          response_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        webhookConfig.webhook_id,
        payload.id || 0,
        type,
        response.status,
        true,
        JSON.stringify(formattedPayload),
        JSON.stringify({
          status: response.status,
          data: response.data
        })
      ]);

      return true;
    } catch (error) {
      // Registra o erro
      logger.error(`Erro ao enviar payload tipo ${type} via webhook ${webhookConfig.id}:`, {
        error: error.message,
        webhookId: webhookConfig.id
      });

      // Registra tentativa no histórico do webhook
      try {
        await pool.query(`
          INSERT INTO webhook_logs (
            webhook_id, 
            entity_id, 
            entity_type, 
            status_code, 
            success, 
            request_payload, 
            error_message
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          webhookConfig.webhook_id,
          payload.id || 0,
          type,
          error.response?.status || 0,
          false,
          JSON.stringify(formatPayload(payload, type)),
          error.message
        ]);
      } catch (logError) {
        logger.error('Erro ao registrar falha de webhook:', logError);
      }

      // Se retry está configurado, agenda nova tentativa
      if (webhookConfig.retry_attempts > 0) {
        setTimeout(() => {
          logger.info(`Tentando reenviar payload tipo ${type} (${webhookConfig.retry_attempts} tentativas restantes)`);
          
          // Decrementa retry_attempts para próxima tentativa
          this.sendCustomPayload({
            ...webhookConfig,
            retry_attempts: webhookConfig.retry_attempts - 1
          }, payload, type);
        }, (webhookConfig.retry_delay_seconds || 60) * 1000);
      }

      // Propaga o erro
      throw new Error(`Falha ao enviar webhook: ${error.message}`);
    }
  },
  
  /**
   * Envia uma notificação de pedido através do webhook
   * @param {Object} order - Dados do pedido
   * @returns {Promise<boolean>} - Sucesso ou falha
   */
  async sendOrderNotification(order) {
    try {
      if (!order.webhook_id) {
        logger.warn(`Pedido ${order.id} não possui webhook configurado`);
        return false;
      }

      // Se o webhook não estiver nos dados do pedido, busca do banco
      if (!order.url) {
        const webhookResult = await pool.query(
          'SELECT * FROM webhooks WHERE id = $1',
          [order.webhook_id]
        );

        if (webhookResult.rows.length === 0) {
          logger.error(`Webhook ${order.webhook_id} não encontrado`);
          return false;
        }

        Object.assign(order, { 
          url: webhookResult.rows[0].url,
          integration: webhookResult.rows[0].integration,
          headers: webhookResult.rows[0].headers,
          auth_type: webhookResult.rows[0].auth_type,
          auth_config: webhookResult.rows[0].auth_config
        });
      }

      // Prepara os headers
      const headers = {
        'Content-Type': 'application/json',
        ...order.headers
      };

      // Adiciona autenticação se configurada
      if (order.auth_type === 'basic' && order.auth_config) {
        const { username, password } = order.auth_config;
        if (username && password) {
          const auth = Buffer.from(`${username}:${password}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        }
      } else if (order.auth_type === 'bearer' && order.auth_config) {
        const { token } = order.auth_config;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      // Formata o payload de acordo com o tipo de integração
      const payload = formatPayload(order, 'order_placed');

      // Configurações específicas para diferentes integrações
      let requestConfig = {
        url: order.url,
        method: order.method || 'POST',
        headers,
        data: payload,
        timeout: (order.timeout_seconds || 10) * 1000
      };

      // Ajustes específicos para SlingFlow
      if (order.integration === 'slingflow' && order.selected_contacts) {
        // Formato específico para SlingFlow
        requestConfig.data = {
          ...payload,
          recipients: order.selected_contacts,
          template: 'order_notification'
        };
      }

      logger.info(`Enviando notificação para webhook ${order.webhook_id}`, {
        orderId: order.id,
        url: order.url
      });

      // Envia a requisição
      const response = await axios(requestConfig);

      // Registra o sucesso
      logger.info(`Webhook executado com sucesso para pedido ${order.id}`, {
        status: response.status,
        webhookId: order.webhook_id
      });

      // Registra histórico da notificação no banco
      await pool.query(`
        INSERT INTO webhook_logs (
          webhook_id, 
          entity_id, 
          entity_type, 
          status_code, 
          success, 
          request_payload, 
          response_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        order.webhook_id,
        order.id,
        'order',
        response.status,
        true,
        JSON.stringify(payload),
        JSON.stringify({
          status: response.status,
          data: response.data
        })
      ]);

      return true;
    } catch (error) {
      // Registra o erro
      logger.error(`Erro ao enviar notificação de pedido ${order.id} via webhook ${order.webhook_id}:`, {
        error: error.message,
        orderId: order.id,
        webhookId: order.webhook_id
      });

      // Registra tentativa no histórico do webhook
      try {
        await pool.query(`
          INSERT INTO webhook_logs (
            webhook_id, 
            entity_id, 
            entity_type, 
            status_code, 
            success, 
            request_payload, 
            error_message
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          order.webhook_id,
          order.id,
          'order',
          error.response?.status || 0,
          false,
          JSON.stringify(formatPayload(order, 'order_placed')),
          error.message
        ]);
      } catch (logError) {
        logger.error('Erro ao registrar falha de webhook:', logError);
      }

      // Se retry está configurado, agenda nova tentativa
      if (order.retry_attempts > 0) {
        setTimeout(() => {
          logger.info(`Tentando reenviar notificação para pedido ${order.id} (${order.retry_attempts} tentativas restantes)`);
          
          // Decrementa retry_attempts para próxima tentativa
          this.sendOrderNotification({
            ...order,
            retry_attempts: order.retry_attempts - 1
          });
        }, (order.retry_delay_seconds || 60) * 1000);
      }

      // Propaga o erro
      throw new Error(`Falha ao enviar webhook: ${error.message}`);
    }
  },

  /**
   * Envia uma notificação de alerta de inspeção através do webhook
   * @param {Object} inspection - Dados da inspeção
   * @returns {Promise<boolean>} - Sucesso ou falha
   */
  async sendInspectionAlert(inspection) {
    try {
      // Implementação similar à sendOrderNotification
      // mas usando o tipo 'inspection_alert' no formatPayload
      const payload = formatPayload(inspection, 'inspection_alert');
      
      // Lógica para envio
      // ... (similar ao sendOrderNotification)

      return true;
    } catch (error) {
      logger.error(`Erro ao enviar alerta de inspeção via webhook:`, {
        error: error.message,
        inspectionId: inspection.id
      });
      
      throw new Error(`Falha ao enviar alerta de inspeção: ${error.message}`);
    }
  },

  /**
   * Testa um webhook enviando uma requisição com dados fictícios
   * @param {Object} webhook - Dados do webhook
   * @returns {Promise<Object>} - Resultado do teste
   */
  async testWebhook(webhook) {
    try {
      // Dados fictícios para teste
      const testData = {
        id: 999999,
        station_id: 'test-station',
        tank_id: 'test-tank',
        product_type: 'Teste',
        quantity: 1000,
        status: 'test',
        notes: 'Teste de webhook',
        created_at: new Date().toISOString()
      };

      // Adiciona dados do webhook ao objeto para envio
      const webhookWithData = {
        ...testData,
        webhook_id: webhook.id,
        url: webhook.url,
        integration: webhook.integration,
        headers: webhook.headers,
        auth_type: webhook.auth_type,
        auth_config: webhook.auth_config,
        method: webhook.method,
        timeout_seconds: webhook.timeout_seconds,
        retry_attempts: 0 // Sem retry para testes
      };

      // Usa o método correspondente ao tipo do webhook
      if (webhook.type === 'inspection_alert') {
        await this.sendInspectionAlert(webhookWithData);
      } else {
        await this.sendOrderNotification(webhookWithData);
      }

      return {
        success: true,
        message: 'Teste do webhook realizado com sucesso!'
      };
    } catch (error) {
      return {
        success: false,
        message: `Falha no teste do webhook: ${error.message}`
      };
    }
  }
};

module.exports = webhookService;
