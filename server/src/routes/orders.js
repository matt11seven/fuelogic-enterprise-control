const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

let cachedOrderStatuses = null;

async function getAllowedOrderStatuses() {
  if (cachedOrderStatuses) return cachedOrderStatuses;
  try {
    const result = await db.query(
      `
      SELECT pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'orders'
        AND c.conname = 'orders_status_check'
      LIMIT 1
      `,
      [],
    );

    const def = result.rows?.[0]?.def || '';
    const matches = [...def.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    cachedOrderStatuses = matches.length > 0
      ? new Set(matches)
      : new Set(['pending', 'quoted', 'approved', 'delivering', 'delivered', 'cancelled']);
  } catch {
    cachedOrderStatuses = new Set(['pending', 'quoted', 'approved', 'delivering', 'delivered', 'cancelled']);
  }
  return cachedOrderStatuses;
}

async function toDbStatus(apiStatus) {
  const allowed = await getAllowedOrderStatuses();
  if (allowed.has(apiStatus)) return apiStatus;

  const candidates = {
    pending: ['pending', 'pendente'],
    quoted: ['quoted', 'processando'],
    approved: ['approved', 'processando'],
    delivering: ['delivering', 'processando'],
    delivered: ['delivered', 'concluido'],
    cancelled: ['cancelled', 'cancelado'],
  };

  const list = candidates[apiStatus] || [apiStatus];
  for (const candidate of list) {
    if (allowed.has(candidate)) return candidate;
  }
  return list[0];
}

function fromDbStatus(dbStatus) {
  const map = {
    pendente: 'pending',
    processando: 'quoted',
    concluido: 'delivered',
    cancelado: 'cancelled',
  };
  return map[dbStatus] || dbStatus;
}

function normalizeOrderRow(row) {
  return { ...row, status: fromDbStatus(row.status) };
}

async function resolveOrderUserId(reqUser) {
  const rawId = reqUser?.id;
  if (rawId && rawId !== 'master-user') return rawId;

  const preferredUsername = reqUser?.username || process.env.MASTER_USERNAME || 'admin';
  let result = await db.query(
    `SELECT id FROM users WHERE username = $1 AND is_active = true LIMIT 1`,
    [preferredUsername],
  );
  if (result.rows.length > 0) return result.rows[0].id;

  result = await db.query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.is_active = true AND r.name = 'admin'
     ORDER BY u.id
     LIMIT 1`,
    [],
  );
  if (result.rows.length > 0) return result.rows[0].id;

  return null;
}

async function getRequestUserIdOrFail(req, res) {
  const userId = await resolveOrderUserId(req.user);
  if (!userId) {
    res.status(400).json({ message: 'Usuário inválido para operar pedidos' });
    return null;
  }
  return userId;
}

// Middleware de autenticação em todas as rotas
router.use(authenticateToken);

// GET /api/orders - Listar pedidos com filtros
router.get('/', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const { status, station_id, date_from, date_to, search, page = 1, limit = 50 } = req.query;

    let conditions = ['o.user_id = $1'];
    const params = [userId];
    let paramIdx = 2;

    if (status && status !== 'all') {
      const dbStatus = await toDbStatus(status);
      conditions.push(`o.status = $${paramIdx++}`);
      params.push(dbStatus);
    }
    if (station_id) {
      conditions.push(`o.station_id = $${paramIdx++}`);
      params.push(station_id);
    }
    if (date_from) {
      conditions.push(`o.created_at >= $${paramIdx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`o.created_at <= $${paramIdx++}`);
      params.push(date_to);
    }
    if (search) {
      conditions.push(`(o.station_name ILIKE $${paramIdx} OR o.product_type ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = conditions.join(' AND ');

    const result = await db.query(
      `SELECT o.*, t.name as truck_name, t.driver_name, t.license_plate
       FROM orders o
       LEFT JOIN trucks t ON o.truck_id = t.id
       WHERE ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM orders o WHERE ${whereClause}`,
      params
    );

    res.json({
      orders: result.rows.map(normalizeOrderRow),
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ message: 'Erro ao listar pedidos' });
  }
});

// GET /api/orders/stats - Métricas de pedidos
router.get('/stats', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;

    const result = await db.query(
      `SELECT status, COUNT(*)::int AS total, COALESCE(SUM(quantity), 0)::numeric AS volume
       FROM orders
       WHERE user_id = $1
       GROUP BY status`,
      [userId]
    );
    const stats = {
      pending: 0,
      quoted: 0,
      approved: 0,
      delivering: 0,
      delivered: 0,
      cancelled: 0,
      total_volume: 0,
    };
    for (const row of result.rows) {
      const apiStatus = fromDbStatus(row.status);
      if (Object.prototype.hasOwnProperty.call(stats, apiStatus)) {
        stats[apiStatus] += Number(row.total || 0);
      }
      stats.total_volume += Number(row.volume || 0);
    }
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

// GET /api/orders/:id - Detalhes de um pedido
router.get('/:id', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const orderId = req.params.id;

    const orderResult = await db.query(
      `SELECT o.*, t.name as truck_name, t.driver_name, t.license_plate
       FROM orders o
       LEFT JOIN trucks t ON o.truck_id = t.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    const order = orderResult.rows[0];

    const timelineResult = await db.query(
      'SELECT * FROM order_timeline WHERE order_id = $1 ORDER BY created_at ASC',
      [orderId]
    );

    let quotations = [];
    if (order.group_id) {
      const quotationsResult = await db.query(
        'SELECT * FROM order_quotations WHERE order_group_id = $1 ORDER BY unit_price ASC',
        [order.group_id]
      );
      quotations = quotationsResult.rows;
    }

    res.json({ ...normalizeOrderRow(order), timeline: timelineResult.rows, quotations });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ message: 'Erro ao buscar pedido' });
  }
});

// POST /api/orders/bulk - Criar múltiplos pedidos de um batch
router.post('/bulk', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const { group_id, orders } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: 'Lista de pedidos inválida' });
    }

    await db.query('BEGIN');
    const pendingDbStatus = await toDbStatus('pending');

    const createdOrders = [];

    for (const order of orders) {
      const { station_id, station_name, tank_id, product_type, quantity } = order;

      const result = await db.query(
        `INSERT INTO orders (user_id, group_id, station_id, station_name, tank_id, product_type, quantity, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, group_id, station_id, station_name, tank_id, product_type, quantity, pendingDbStatus]
      );

      const newOrder = result.rows[0];
      createdOrders.push(newOrder);

      await db.query(
        `INSERT INTO order_timeline (order_id, status, description, created_by)
         VALUES ($1, 'pending', 'Pedido criado', 'sistema')`,
        [newOrder.id]
      );
    }

    await db.query('COMMIT');

    res.status(201).json({ success: true, orders: createdOrders.map(normalizeOrderRow), group_id });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao criar pedidos em lote:', error);
    res.status(500).json({ message: 'Erro ao criar pedidos', details: error.message });
  }
});

// PATCH /api/orders/:id/status - Atualizar status manualmente
router.patch('/:id/status', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const orderId = req.params.id;
    const { status, description } = req.body;

    const validStatuses = ['pending', 'quoted', 'approved', 'delivering', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }
    const dbStatus = await toDbStatus(status);

    await db.query('BEGIN');

    const result = await db.query(
      `UPDATE orders SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [dbStatus, orderId, userId]
    );

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    await db.query(
      `INSERT INTO order_timeline (order_id, status, description, created_by)
       VALUES ($1, $2, $3, 'operador')`,
      [orderId, status, description || `Status alterado para ${status}`]
    );

    await db.query('COMMIT');

    res.json(normalizeOrderRow(result.rows[0]));
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ message: 'Erro ao atualizar status' });
  }
});

// PATCH /api/orders/:id/sophia-sent - Marcar como enviado para Sophia
router.patch('/:id/sophia-sent', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const orderId = req.params.id;

    await db.query('BEGIN');

    const result = await db.query(
      `UPDATE orders SET sophia_sent_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [orderId, userId]
    );

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    await db.query(
      `INSERT INTO order_timeline (order_id, status, description, created_by)
       VALUES ($1, 'pending', 'Enviado para Sophia para cotação', 'sistema')`,
      [orderId]
    );

    await db.query('COMMIT');

    res.json(normalizeOrderRow(result.rows[0]));
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao marcar sophia_sent:', error);
    res.status(500).json({ message: 'Erro ao atualizar pedido' });
  }
});

// PATCH /api/orders/group/:groupId/sophia-sent - Marcar grupo como enviado para Sophia
router.patch('/group/:groupId/sophia-sent', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const { groupId } = req.params;

    await db.query('BEGIN');

    const result = await db.query(
      `UPDATE orders
       SET sophia_sent_at = NOW(), updated_at = NOW()
       WHERE group_id = $1 AND user_id = $2
       RETURNING id`,
      [groupId, userId]
    );

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Nenhum pedido encontrado para o grupo informado' });
    }

    for (const row of result.rows) {
      await db.query(
        `INSERT INTO order_timeline (order_id, status, description, created_by)
         VALUES ($1, 'pending', 'Enviado para Sophia para cotação', 'sistema')`,
        [row.id]
      );
    }

    await db.query('COMMIT');

    return res.json({
      success: true,
      group_id: groupId,
      updated: result.rows.length,
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao marcar grupo como enviado para Sophia:', error);
    return res.status(500).json({ message: 'Erro ao atualizar pedidos do grupo' });
  }
});

// PATCH /api/orders/:id/truck - Vincular caminhão
router.patch('/:id/truck', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const orderId = req.params.id;
    const { truck_id } = req.body;

    const result = await db.query(
      `UPDATE orders SET truck_id = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [truck_id, orderId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    res.json(normalizeOrderRow(result.rows[0]));
  } catch (error) {
    console.error('Erro ao vincular caminhão:', error);
    res.status(500).json({ message: 'Erro ao vincular caminhão' });
  }
});

// PATCH /api/orders/:id/delivery-estimate - Definir previsão de entrega
router.patch('/:id/delivery-estimate', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const orderId = req.params.id;
    const { delivery_estimate } = req.body;

    const result = await db.query(
      `UPDATE orders SET delivery_estimate = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [delivery_estimate, orderId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    res.json(normalizeOrderRow(result.rows[0]));
  } catch (error) {
    console.error('Erro ao definir previsão de entrega:', error);
    res.status(500).json({ message: 'Erro ao definir previsão de entrega' });
  }
});

// POST /api/orders/:id/notes - Adicionar nota
router.post('/:id/notes', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const orderId = req.params.id;
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ message: 'Nota não pode ser vazia' });
    }

    const existing = await db.query(
      'SELECT notes FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    const timestamp = new Date().toLocaleString('pt-BR');
    const newNote = `[${timestamp}] ${note}`;
    const currentNotes = existing.rows[0].notes;
    const updatedNotes = currentNotes ? `${currentNotes}\n${newNote}` : newNote;

    const result = await db.query(
      `UPDATE orders SET notes = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [updatedNotes, orderId, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao adicionar nota:', error);
    res.status(500).json({ message: 'Erro ao adicionar nota' });
  }
});

// POST /api/orders/group/:groupId/quotations - Receber cotações por grupo
router.post('/group/:groupId/quotations', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const { groupId } = req.params;
    const { quotations } = req.body;

    if (!quotations || !Array.isArray(quotations)) {
      return res.status(400).json({ message: 'Lista de cotações inválida' });
    }

    await db.query('BEGIN');

    for (const q of quotations) {
      await db.query(
        `INSERT INTO order_quotations (order_group_id, supplier_name, product_type, unit_price, total_price, delivery_days, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [groupId, q.supplier_name, q.product_type, q.unit_price, q.total_price, q.delivery_days, q.notes]
      );
    }

    const quotedDbStatus = await toDbStatus('quoted');
    await db.query(
      `UPDATE orders SET status = $3, updated_at = NOW()
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId, quotedDbStatus]
    );

    const orderIds = await db.query(
      'SELECT id FROM orders WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    for (const row of orderIds.rows) {
      await db.query(
        `INSERT INTO order_timeline (order_id, status, description, created_by)
         VALUES ($1, 'quoted', 'Cotações recebidas da Sophia', 'sophia')`,
        [row.id]
      );
    }

    await db.query('COMMIT');

    res.json({ success: true, quotations_saved: quotations.length });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao salvar cotações:', error);
    res.status(500).json({ message: 'Erro ao salvar cotações' });
  }
});

module.exports = router;
