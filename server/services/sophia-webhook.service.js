/**
 * Serviço específico para integração com a IA Sophia
 * Responsável pelo processamento e formatação de pedidos agrupados por empresa
 */
const webhookService = require('./webhook.service');
const pool = require('../db');
const logger = require('../utils/logger');

/**
 * Serviço para integração com a IA Sophia
 */
const sophiaWebhookService = {
  /**
   * Processa pedidos e envia para a IA Sophia agrupados por empresa
   * @param {Array} orders - Array de pedidos para processar
   * @param {Number} webhookId - ID do webhook configurado para a Sophia
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendGroupedOrdersToSophia(orders, webhookId) {
    try {
      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        throw new Error('Nenhum pedido fornecido para processamento');
      }

      if (!webhookId) {
        throw new Error('ID do webhook da Sophia não fornecido');
      }

      // Buscar informações do webhook
      const webhookResult = await pool.query(
        'SELECT * FROM webhooks WHERE id = $1',
        [webhookId]
      );

      if (webhookResult.rows.length === 0) {
        throw new Error(`Webhook ${webhookId} não encontrado`);
      }

      const webhook = webhookResult.rows[0];

      // Buscar informações dos postos relacionados aos pedidos
      const stationIds = [...new Set(orders.map(order => order.station_id))];
      
      const stationsResult = await pool.query(
        `SELECT id, nome, cnpj, logradouro, numero, complemento, bairro, cidade, estado, 
                cep, cliente_gm, id_unidade, indice_equipamento, erp
         FROM postos 
         WHERE id = ANY($1)`,
        [stationIds]
      );

      // Mapeamento de postos por ID
      const stationsMap = {};
      stationsResult.rows.forEach(station => {
        stationsMap[station.id] = station;
      });

      // Agrupar pedidos por posto
      const ordersByStation = {};
      
      for (const order of orders) {
        const stationId = order.station_id;
        
        if (!ordersByStation[stationId]) {
          // Inicializa a estrutura para este posto
          const station = stationsMap[stationId] || { 
            nome: 'Posto não identificado',
            cnpj: 'Não informado'
          };
          
          // Constrói o endereço completo
          const endereco = [station.logradouro, station.numero, station.complemento].filter(Boolean).join(', ');
          
          ordersByStation[stationId] = {
            nome: station.nome,
            cnpj: station.cnpj,
            endereco: endereco,
            bairro: station.bairro,
            cidade: station.cidade,
            estado: station.estado,
            cep: station.cep,
            cliente_gm: station.cliente_gm,
            id_unidade: station.id_unidade,
            indice_equipamento: station.indice_equipamento,
            erp: station.erp,
            pedidos: [],
            totais_por_combustivel: {}
          };
        }
        
        // Adiciona o pedido ao posto correspondente
        ordersByStation[stationId].pedidos.push({
          id: order.id,
          tank_id: order.tank_id,
          product_type: order.product_type,
          quantity: order.quantity,
          scheduled_date: order.scheduled_date,
          notes: order.notes
        });
        
        // Atualiza os totais por tipo de combustível para este posto
        const productType = order.product_type;
        if (!ordersByStation[stationId].totais_por_combustivel[productType]) {
          ordersByStation[stationId].totais_por_combustivel[productType] = 0;
        }
        ordersByStation[stationId].totais_por_combustivel[productType] += order.quantity;
      }
      
      // Converter para array de postos
      const postos = Object.values(ordersByStation);
      
      // Calcular resumo geral
      const resumoGeral = {
        total_combustiveis: {},
        quantidade_total: 0
      };
      
      // Calcular totais por tipo de combustível
      const totalsByProduct = {};
      postos.forEach(station => {
        Object.entries(station.totais_por_combustivel).forEach(([product, amount]) => {
          if (!resumoGeral.total_combustiveis[product]) {
            resumoGeral.total_combustiveis[product] = 0;
          }
          resumoGeral.total_combustiveis[product] += amount;
          resumoGeral.quantidade_total += amount;
        });
      });
      
      // Estimar data de entrega (3 dias úteis a partir de hoje)
      const dataEntrega = new Date();
      dataEntrega.setDate(dataEntrega.getDate() + 3);
      resumoGeral.data_entrega_estimada = dataEntrega.toISOString();
      
      // Formatar o payload para a IA Sophia
      const payload = {
        postos: postos,
        resumo_geral: {
          total_postos: postos.length,
          total_pedidos: orders.length,
          totais_combustiveis: resumoGeral.total_combustiveis
        }
      };
      
      // Configurar o webhook com os dados da Sophia
      const sophiaWebhookData = {
        id: webhook.id,
        url: webhook.url,
        integration: 'sophia_ai',
        headers: webhook.headers || {},
        auth_type: webhook.auth_type,
        auth_config: webhook.auth_config,
        method: webhook.method || 'POST',
        webhook_id: webhook.id
      };
      
      // Enviar os dados para a Sophia via webhook
      logger.info(`Enviando pedidos agrupados para IA Sophia via webhook ${webhookId}`, {
        totalEmpresas: empresas.length,
        totalPedidos: orders.length
      });
      
      // Chamar o serviço de webhook genérico com o tipo sophia_ai_order
      const result = await webhookService.sendCustomPayload(
        sophiaWebhookData, 
        sophiaPayload, 
        'sophia_ai_order'
      );
      
      // Atualizar os pedidos para indicar que foram notificados
      const orderIds = orders.map(order => order.id);
      await pool.query(
        `UPDATE orders 
         SET notification_sent = true, 
             updated_at = NOW() 
         WHERE id = ANY($1)`,
        [orderIds]
      );
      
      return {
        success: true,
        message: `Pedidos enviados com sucesso para a IA Sophia`,
        details: {
          empresas: empresas.length,
          pedidos: orders.length,
          tipos_combustivel: Object.keys(resumoGeral.total_combustiveis).length
        }
      };
    } catch (error) {
      logger.error('Erro ao processar e enviar pedidos para IA Sophia:', {
        error: error.message,
        webhookId
      });
      
      throw new Error(`Falha ao enviar para IA Sophia: ${error.message}`);
    }
  },
  
  /**
   * Busca todos os pedidos pendentes e envia para a IA Sophia em um único payload agrupado
   * @param {Number} webhookId - ID do webhook da Sophia
   * @returns {Promise<Object>} - Resultado do envio
   */
  async processPendingOrders(webhookId) {
    try {
      // Buscar todos os pedidos pendentes sem notificação enviada
      const pendingOrdersResult = await pool.query(
        `SELECT * FROM orders 
         WHERE status = 'pending' 
         AND notification_sent = false 
         ORDER BY created_at ASC`
      );
      
      const pendingOrders = pendingOrdersResult.rows;
      
      if (pendingOrders.length === 0) {
        return {
          success: true,
          message: 'Nenhum pedido pendente para enviar à IA Sophia'
        };
      }
      
      // Processar e enviar os pedidos agrupados
      return await this.sendGroupedOrdersToSophia(pendingOrders, webhookId);
      
    } catch (error) {
      logger.error('Erro ao processar pedidos pendentes para IA Sophia:', {
        error: error.message,
        webhookId
      });
      
      throw new Error(`Falha ao processar pedidos pendentes: ${error.message}`);
    }
  }
};

module.exports = sophiaWebhookService;
