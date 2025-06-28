/**
 * Controlador de pedidos de combustível
 * Implementa as operações CRUD e endpoints relacionados aos pedidos
 */
const pool = require('../db');
const { handleDbError } = require('../utils/errorHandlers');
const sophiaWebhookService = require('../services/sophia-webhook.service');
const logger = require('../utils/logger');
const webhookService = require('../services/webhook.service');

/**
 * Obtém lista de pedidos com filtros
 * @route GET /api/orders
 */
exports.getOrders = async (req, res) => {
  const { station_id, tank_id, status, start_date, end_date } = req.query;
  const userId = req.user.id;

  try {
    let query = `
      SELECT o.*, w.name as webhook_name
      FROM orders o
      LEFT JOIN webhooks w ON o.webhook_id = w.id
      WHERE o.user_id = $1
    `;
    
    const params = [userId];
    let paramCount = 1;

    // Adicionar filtros condicionalmente
    if (station_id) {
      paramCount++;
      query += ` AND o.station_id = $${paramCount}`;
      params.push(station_id);
    }
    
    if (tank_id) {
      paramCount++;
      query += ` AND o.tank_id = $${paramCount}`;
      params.push(tank_id);
    }
    
    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }
    
    if (start_date) {
      paramCount++;
      query += ` AND o.created_at >= $${paramCount}`;
      params.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND o.created_at <= $${paramCount}`;
      params.push(end_date);
    }
    
    query += ' ORDER BY o.created_at DESC';
    
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar pedidos:', error);
    return handleDbError(res, error);
  }
};

/**
 * Obtém detalhes de um pedido específico
 * @route GET /api/orders/:id
 */
exports.getOrderById = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;

  try {
    const query = `
      SELECT o.*, w.name as webhook_name, w.url as webhook_url
      FROM orders o
      LEFT JOIN webhooks w ON o.webhook_id = w.id
      WHERE o.id = $1 AND o.user_id = $2
    `;
    
    const result = await pool.query(query, [orderId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    logger.error(`Erro ao buscar pedido ${orderId}:`, error);
    return handleDbError(res, error);
  }
};

/**
 * Obtém pedidos de uma estação específica
 * @route GET /api/orders/station/:stationId
 */
exports.getOrdersByStation = async (req, res) => {
  const stationId = req.params.stationId;
  const userId = req.user.id;

  try {
    const query = `
      SELECT * FROM orders
      WHERE station_id = $1 AND user_id = $2
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [stationId, userId]);
    return res.json(result.rows);
  } catch (error) {
    logger.error(`Erro ao buscar pedidos da estação ${stationId}:`, error);
    return handleDbError(res, error);
  }
};

/**
 * Cria um novo pedido
 * @route POST /api/orders
 */
exports.createOrder = async (req, res) => {
  const { station_id, tank_id, product_type, quantity, 
    notes, webhook_id, scheduled_date } = req.body;
  const userId = req.user.id;

  // Validações
  if (!station_id || !tank_id || !product_type || !quantity) {
    return res.status(400).json({ 
      message: 'Os campos station_id, tank_id, product_type e quantity são obrigatórios' 
    });
  }

  try {
    const query = `
      INSERT INTO orders (
        user_id, station_id, tank_id, product_type,
        quantity, notes, webhook_id, scheduled_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const params = [
      userId, station_id, tank_id, product_type,
      quantity, notes, webhook_id, scheduled_date
    ];
    
    const result = await pool.query(query, params);
    const newOrder = result.rows[0];
    
    // Se tiver webhook_id, prepara para notificação
    if (webhook_id) {
      try {
        // Tentar enviar notificação via webhook (implementado no webhook.service.js)
        await webhookService.sendOrderNotification(newOrder);
        
        // Atualizar flag de notificação enviada
        await pool.query(
          'UPDATE orders SET notification_sent = true WHERE id = $1',
          [newOrder.id]
        );
        
        newOrder.notification_sent = true;
      } catch (notifyError) {
        logger.error(`Falha ao enviar notificação para pedido ${newOrder.id}:`, notifyError);
        // Não falhar a criação do pedido se a notificação falhar
      }
    }
    
    return res.status(201).json(newOrder);
  } catch (error) {
    logger.error('Erro ao criar pedido:', error);
    return handleDbError(res, error);
  }
};

/**
 * Cria múltiplos pedidos em lote
 * @route POST /api/orders/bulk
 */
exports.createBulkOrders = async (req, res) => {
  const orders = req.body;
  const userId = req.user.id;
  
  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ message: 'É necessário fornecer um array de pedidos' });
  }
  
  // Validar todos os pedidos antes de começar a processá-los
  for (const order of orders) {
    if (!order.station_id || !order.tank_id || !order.product_type || !order.quantity) {
      return res.status(400).json({ 
        message: 'Todos os pedidos devem conter station_id, tank_id, product_type e quantity' 
      });
    }
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const createdOrders = [];
    
    for (const order of orders) {
      const result = await client.query(`
        INSERT INTO orders (
          user_id, station_id, tank_id, product_type,
          quantity, notes, webhook_id, scheduled_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        userId, 
        order.station_id, 
        order.tank_id, 
        order.product_type,
        order.quantity, 
        order.notes, 
        order.webhook_id, 
        order.scheduled_date
      ]);
      
      createdOrders.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    
    // Processamento em background das notificações
    process.nextTick(async () => {
      for (const order of createdOrders) {
        if (order.webhook_id) {
          try {
            await webhookService.sendOrderNotification(order);
            await pool.query(
              'UPDATE orders SET notification_sent = true WHERE id = $1',
              [order.id]
            );
          } catch (notifyError) {
            logger.error(`Falha ao enviar notificação para pedido ${order.id}:`, notifyError);
          }
        }
      }
    });
    
    return res.status(201).json(createdOrders);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Erro ao criar pedidos em lote:', error);
    return handleDbError(res, error);
  } finally {
    client.release();
  }
};

/**
 * Atualiza um pedido existente
 * @route PUT /api/orders/:id
 */
exports.updateOrder = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  const updateData = req.body;
  
  // Remover campos que não devem ser atualizados diretamente
  delete updateData.id;
  delete updateData.user_id;
  delete updateData.created_at;
  delete updateData.updated_at;
  
  try {
    // Verificar se o pedido existe e pertence ao usuário
    const checkResult = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado ou sem permissão para acessá-lo' });
    }
    
    // Construir consulta dinâmica com base nos campos fornecidos
    const keys = Object.keys(updateData);
    if (keys.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo fornecido para atualização' });
    }
    
    const setClauses = keys.map((key, index) => `${key} = $${index + 3}`).join(', ');
    const values = keys.map(key => updateData[key]);
    
    const query = `
      UPDATE orders
      SET ${setClauses}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [orderId, userId, ...values]);
    return res.json(result.rows[0]);
  } catch (error) {
    logger.error(`Erro ao atualizar pedido ${orderId}:`, error);
    return handleDbError(res, error);
  }
};

/**
 * Atualiza apenas o status de um pedido
 * @route PATCH /api/orders/:id/status
 */
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  
  if (!status) {
    return res.status(400).json({ message: 'Status é obrigatório' });
  }
  
  // Validar status permitido
  const allowedStatuses = ['pending', 'processing', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ 
      message: 'Status inválido. Use: pending, processing, completed, cancelled' 
    });
  }
  
  try {
    const query = `
      UPDATE orders
      SET status = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    logger.error(`Erro ao atualizar status do pedido ${id}:`, error);
    return handleDbError(res, error);
  }
};

/**
 * Remove um pedido
 * @route DELETE /api/orders/:id
 */
exports.deleteOrder = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  
  try {
    const result = await pool.query(
      'DELETE FROM orders WHERE id = $1 AND user_id = $2 RETURNING id',
      [orderId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado ou sem permissão para removê-lo' });
    }
    
    return res.json({ success: true, message: 'Pedido removido com sucesso' });
  } catch (error) {
    logger.error(`Erro ao remover pedido ${orderId}:`, error);
    return handleDbError(res, error);
  }
};

/**
 * Vincula um pedido a um webhook para notificação
 * @route POST /api/orders/:orderId/webhook/:webhookId
 */
exports.linkOrderToWebhook = async (req, res) => {
  const { orderId, webhookId } = req.params;
  const userId = req.user.id;
  
  try {
    // Verificar se o pedido existe e pertence ao usuário
    const orderCheck = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    // Verificar se o webhook existe e pertence ao usuário
    const webhookCheck = await pool.query(
      'SELECT * FROM webhooks WHERE id = $1 AND user_id = $2',
      [webhookId, userId]
    );
    
    if (webhookCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Webhook não encontrado' });
    }
    
    // Atualizar o pedido com a referência ao webhook
    const result = await pool.query(
      'UPDATE orders SET webhook_id = $1 WHERE id = $2 RETURNING *',
      [webhookId, orderId]
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    logger.error(`Erro ao vincular pedido ${orderId} ao webhook ${webhookId}:`, error);
    return handleDbError(res, error);
  }
};

/**
 * Envia uma notificação de pedido pelo webhook
 * @route POST /api/orders/:id/notify
 */
exports.sendOrderNotification = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  
  try {
    // Buscar pedido com informações do webhook
    const query = `
      SELECT o.*, w.id as webhook_id, w.url, w.name, w.integration, w.headers, w.auth_type, w.auth_config 
      FROM orders o
      LEFT JOIN webhooks w ON o.webhook_id = w.id
      WHERE o.id = $1 AND o.user_id = $2
    `;
    
    const result = await pool.query(query, [orderId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    const order = result.rows[0];
    
    if (!order.webhook_id) {
      return res.status(400).json({ message: 'Este pedido não possui webhook configurado' });
    }
    
    // Enviar notificação via webhook service
    await webhookService.sendOrderNotification(order);
    
    // Atualizar flag de notificação enviada
    await pool.query(
      'UPDATE orders SET notification_sent = true WHERE id = $1',
      [orderId]
    );
    
    return res.json({ 
      success: true, 
      message: 'Notificação enviada com sucesso'
    });
  } catch (error) {
    logger.error(`Erro ao enviar notificação para pedido ${orderId}:`, error);
    return res.status(500).json({ 
      success: false, 
      message: `Erro ao enviar notificação: ${error.message}` 
    });
  }
};

/**
 * Obtém estatísticas de pedidos
 * @route GET /api/orders/stats
 */
exports.getOrderStats = async (req, res) => {
  const { start_date, end_date } = req.query;
  const userId = req.user.id;
  
  try {
    // Validar datas
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Os parâmetros start_date e end_date são obrigatórios' });
    }
    
    // Estatísticas por status
    const statusQuery = `
      SELECT status, COUNT(*) as count, SUM(quantity) as total_volume
      FROM orders
      WHERE user_id = $1
        AND created_at BETWEEN $2 AND $3
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const statusResult = await pool.query(statusQuery, [userId, start_date, end_date]);
    
    // Estatísticas por produto
    const productQuery = `
      SELECT product_type, COUNT(*) as count, SUM(quantity) as total_volume
      FROM orders
      WHERE user_id = $1
        AND created_at BETWEEN $2 AND $3
      GROUP BY product_type
      ORDER BY total_volume DESC
    `;
    
    const productResult = await pool.query(productQuery, [userId, start_date, end_date]);
    
    // Estatísticas por estação
    const stationQuery = `
      SELECT station_id, COUNT(*) as count, SUM(quantity) as total_volume
      FROM orders
      WHERE user_id = $1
        AND created_at BETWEEN $2 AND $3
      GROUP BY station_id
      ORDER BY total_volume DESC
    `;
    
    const stationResult = await pool.query(stationQuery, [userId, start_date, end_date]);
    
    // Total geral
    const totalQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(quantity) as total_volume,
        COUNT(DISTINCT station_id) as total_stations
      FROM orders
      WHERE user_id = $1
        AND created_at BETWEEN $2 AND $3
    `;
    
    const totalResult = await pool.query(totalQuery, [userId, start_date, end_date]);
    
    return res.json({
      by_status: statusResult.rows,
      by_product: productResult.rows,
      by_station: stationResult.rows,
      summary: totalResult.rows[0]
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas de pedidos:', error);
    return handleDbError(res, error);
  }
};
