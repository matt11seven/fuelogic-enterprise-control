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

function canTransitionOrderStatus(current, next) {
  const transitions = {
    pending: new Set(['quoted', 'cancelled']),
    quoted: new Set(['approved', 'cancelled']),
    approved: new Set(['delivering', 'cancelled']),
    delivering: new Set(['delivered', 'cancelled']),
    delivered: new Set([]),
    cancelled: new Set([]),
  };
  return transitions[current]?.has(next) || false;
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

function normalizeBaseName(value) {
  const raw = String(value || '').trim();
  return raw || 'Bagam';
}

function normalizeFreightCost(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function removeMetaNotes(text) {
  return String(text || '')
    .replace(/\[BASE:[^\]]+\]\s*/gi, '')
    .replace(/\[FRETE_RL:[^\]]+\]\s*/gi, '')
    .trim();
}

function withQuotationMeta(notes, baseName, freightCostRl) {
  const cleanBase = normalizeBaseName(baseName);
  const cleanFreight = normalizeFreightCost(freightCostRl);
  const cleanNotes = removeMetaNotes(notes);
  const markers = [`[BASE:${cleanBase}]`];
  if (cleanFreight != null) markers.push(`[FRETE_RL:${cleanFreight.toFixed(4)}]`);
  return cleanNotes ? `${markers.join(' ')} ${cleanNotes}` : markers.join(' ');
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

// GET /api/orders/group/:groupId - Pedidos e cotações do grupo
router.get('/group/:groupId', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const { groupId } = req.params;

    const ordersResult = await db.query(
      `SELECT o.*, t.name as truck_name, t.driver_name, t.license_plate
       FROM orders o
       LEFT JOIN trucks t ON o.truck_id = t.id
       WHERE o.group_id = $1 AND o.user_id = $2
       ORDER BY o.created_at ASC`,
      [groupId, userId],
    );

    if (ordersResult.rows.length === 0) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const quotationsResult = await db.query(
      `SELECT * FROM order_quotations WHERE order_group_id = $1 ORDER BY unit_price ASC`,
      [groupId],
    );

    res.json({
      group_id: groupId,
      orders: ordersResult.rows.map(normalizeOrderRow),
      quotations: quotationsResult.rows,
    });
  } catch (error) {
    console.error('Erro ao buscar grupo:', error);
    res.status(500).json({ message: 'Erro ao buscar grupo' });
  }
});

// PATCH /api/orders/group/:groupId/emit - Emitir pedido para todos do grupo (approved → delivering)
router.patch('/group/:groupId/emit', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const { groupId } = req.params;
    const { chosen_supplier, truck_id, delivery_estimate, notes } = req.body;

    if (!delivery_estimate) {
      return res.status(400).json({ message: 'A previsão de entrega (ETA) é obrigatória para emitir o pedido.' });
    }

    await db.query('BEGIN');

    const deliveringDbStatus = await toDbStatus('delivering');
    const result = await db.query(
      `UPDATE orders
       SET status = $1, truck_id = COALESCE($2, truck_id), delivery_estimate = $3, updated_at = NOW()
       WHERE group_id = $4 AND user_id = $5 AND status = 'approved'
       RETURNING id`,
      [deliveringDbStatus, truck_id || null, delivery_estimate, groupId, userId],
    );

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Nenhum pedido aprovado encontrado para o grupo.' });
    }

    const timelineDesc = [
      'Pedido emitido',
      chosen_supplier ? `Fornecedor: ${chosen_supplier}` : null,
      delivery_estimate ? `ETA: ${delivery_estimate}` : null,
      notes || null,
    ].filter(Boolean).join(' | ');

    for (const row of result.rows) {
      await db.query(
        `INSERT INTO order_timeline (order_id, status, description, created_by)
         VALUES ($1, 'delivering', $2, 'operador')`,
        [row.id, timelineDesc],
      );
    }

    await db.query('COMMIT');

    res.json({ success: true, updated: result.rows.length, group_id: groupId });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao emitir pedido do grupo:', error);
    res.status(500).json({ message: 'Erro ao emitir pedido do grupo' });
  }
});

// PATCH /api/orders/group/:groupId/approve - Aprovar todos os pedidos do grupo
router.patch('/group/:groupId/approve', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const { groupId } = req.params;

    const quoteCount = await db.query(
      `SELECT COUNT(*)::int AS total FROM order_quotations WHERE order_group_id = $1`,
      [groupId],
    );
    if ((quoteCount.rows[0]?.total || 0) < 1) {
      return res.status(400).json({ message: 'É necessário pelo menos 1 cotação para aprovar o grupo.' });
    }

    await db.query('BEGIN');

    const approvedDbStatus = await toDbStatus('approved');
    const result = await db.query(
      `UPDATE orders SET status = $1, updated_at = NOW()
       WHERE group_id = $2 AND user_id = $3 AND status IN ('pending', 'quoted')
       RETURNING id`,
      [approvedDbStatus, groupId, userId],
    );

    for (const row of result.rows) {
      await db.query(
        `INSERT INTO order_timeline (order_id, status, description, created_by)
         VALUES ($1, 'approved', 'Aprovado pela decisão de compra', 'operador')`,
        [row.id],
      );
    }

    await db.query('COMMIT');

    res.json({ success: true, updated: result.rows.length, group_id: groupId });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao aprovar grupo:', error);
    res.status(500).json({ message: 'Erro ao aprovar grupo' });
  }
});

// GET /api/orders/quotations/analytics - Historico de cotacoes (dia, dia anterior, medias)
router.get('/quotations/analytics', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;

    const { ref_date } = req.query;
    const refDate = String(ref_date || '').trim() || new Date().toISOString().slice(0, 10);

    const baseParams = [userId, refDate];
    const baseScope = `
      FROM order_quotations oq
      WHERE EXISTS (
        SELECT 1
        FROM orders o
        WHERE o.group_id = oq.order_group_id
          AND o.user_id = $1
      )
    `;

    const todayResult = await db.query(
      `
      SELECT
        oq.id,
        oq.order_group_id,
        oq.supplier_name,
        oq.product_type,
        oq.unit_price,
        oq.delivery_days,
        oq.created_at,
        COALESCE(NULLIF(SUBSTRING(COALESCE(oq.notes, '') FROM '\\[BASE:([^\\]]+)\\]'), ''), 'Bagam') AS base_name,
        NULLIF(SUBSTRING(COALESCE(oq.notes, '') FROM '\\[FRETE_RL:([0-9]+(?:\\.[0-9]+)?)\\]'), '')::numeric(10,4) AS freight_cost_rl,
        CASE
          WHEN oq.notes ~* '\\[CIF\\]' THEN 'CIF'
          WHEN oq.notes ~* '\\[FOB\\]' THEN 'FOB'
          ELSE ''
        END AS freight_type
      ${baseScope}
        AND oq.created_at::date = $2::date
      ORDER BY oq.created_at DESC
      LIMIT 500
      `,
      baseParams,
    );

    const yesterdayResult = await db.query(
      `
      SELECT
        oq.id,
        oq.order_group_id,
        oq.supplier_name,
        oq.product_type,
        oq.unit_price,
        oq.delivery_days,
        oq.created_at,
        COALESCE(NULLIF(SUBSTRING(COALESCE(oq.notes, '') FROM '\\[BASE:([^\\]]+)\\]'), ''), 'Bagam') AS base_name,
        NULLIF(SUBSTRING(COALESCE(oq.notes, '') FROM '\\[FRETE_RL:([0-9]+(?:\\.[0-9]+)?)\\]'), '')::numeric(10,4) AS freight_cost_rl,
        CASE
          WHEN oq.notes ~* '\\[CIF\\]' THEN 'CIF'
          WHEN oq.notes ~* '\\[FOB\\]' THEN 'FOB'
          ELSE ''
        END AS freight_type
      ${baseScope}
        AND oq.created_at::date = ($2::date - INTERVAL '1 day')
      ORDER BY oq.created_at DESC
      LIMIT 500
      `,
      baseParams,
    );

    const weeklyAvgResult = await db.query(
      `
      SELECT
        oq.supplier_name,
        oq.product_type,
        AVG(oq.unit_price)::numeric(12,4) AS avg_unit_price,
        COUNT(*)::int AS samples
      ${baseScope}
        AND oq.created_at::date BETWEEN ($2::date - INTERVAL '6 day') AND $2::date
      GROUP BY oq.supplier_name, oq.product_type
      ORDER BY oq.product_type ASC, avg_unit_price ASC
      `,
      baseParams,
    );

    const monthlyAvgResult = await db.query(
      `
      SELECT
        oq.supplier_name,
        oq.product_type,
        AVG(oq.unit_price)::numeric(12,4) AS avg_unit_price,
        COUNT(*)::int AS samples
      ${baseScope}
        AND oq.created_at::date BETWEEN date_trunc('month', $2::date)::date AND $2::date
      GROUP BY oq.supplier_name, oq.product_type
      ORDER BY oq.product_type ASC, avg_unit_price ASC
      `,
      baseParams,
    );

    return res.json({
      success: true,
      reference_date: refDate,
      today_rows: todayResult.rows,
      yesterday_rows: yesterdayResult.rows,
      weekly_avg: weeklyAvgResult.rows,
      monthly_avg: monthlyAvgResult.rows,
    });
  } catch (error) {
    console.error('Erro ao buscar analytics de cotações:', error);
    return res.status(500).json({ message: 'Erro ao buscar analytics de cotações' });
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
      return res.status(400).json({ message: 'Status inv�lido' });
    }

    await db.query('BEGIN');

    const existingResult = await db.query(
      `SELECT id, status, group_id, delivery_estimate
       FROM orders
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [orderId, userId],
    );

    if (existingResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Pedido n�o encontrado' });
    }

    const existing = normalizeOrderRow(existingResult.rows[0]);
    if (!canTransitionOrderStatus(existing.status, status)) {
      await db.query('ROLLBACK');
      return res.status(400).json({
        message: `Transi��o inv�lida: ${existing.status} -> ${status}`,
      });
    }

    if (status === 'approved' && existing.group_id) {
      const quoteCount = await db.query(
        `SELECT COUNT(*)::int AS total FROM order_quotations WHERE order_group_id = $1`,
        [existing.group_id],
      );
      if ((quoteCount.rows[0]?.total || 0) < 1) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          message: 'Aprova��o humana requer pelo menos 1 cota��o registrada.',
        });
      }
    }

    if (status === 'delivering' && !existing.delivery_estimate) {
      await db.query('ROLLBACK');
      return res.status(400).json({
        message: 'Para iniciar entrega, defina a previs�o de entrega (ETA).',
      });
    }

    const dbStatus = await toDbStatus(status);
    const result = await db.query(
      `UPDATE orders SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [dbStatus, orderId, userId]
    );

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
         VALUES ($1, 'pending', 'Enviado para Sophia para cota��o', 'sistema')`,
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

// POST /api/orders/group/:groupId/quotations - Receber cota��es por grupo
router.post('/group/:groupId/quotations', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;
    const { groupId } = req.params;
      const { quotations, source = 'manual' } = req.body;

    if (!quotations || !Array.isArray(quotations)) {
      return res.status(400).json({ message: 'Lista de cota��es inv�lida' });
    }

    await db.query('BEGIN');

    for (const q of quotations) {
      await db.query(
        `INSERT INTO order_quotations (order_group_id, supplier_name, product_type, unit_price, total_price, delivery_days, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          groupId,
          q.supplier_name,
          q.product_type,
          q.unit_price,
          q.total_price,
          q.delivery_days,
          withQuotationMeta(q.notes, q.base_name, q.freight_cost_rl),
        ]
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

    const timelineDescription = source === 'sophia'
      ? 'Cota��es recebidas da Sophia'
      : 'Cota��es registradas manualmente';
    const timelineActor = source === 'sophia' ? 'sophia' : 'operador';

    for (const row of orderIds.rows) {
      await db.query(
        `INSERT INTO order_timeline (order_id, status, description, created_by)
         VALUES ($1, 'quoted', $2, $3)`,
        [row.id, timelineDescription, timelineActor]
      );
    }

    await db.query('COMMIT');

    res.json({ success: true, quotations_saved: quotations.length });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao salvar cota��es:', error);
    res.status(500).json({ message: 'Erro ao salvar cota��es' });
  }
});

// POST /api/orders/purchase-decision - Decisão de compra: agrupa pedidos pending por fornecedor selecionado
router.post('/purchase-decision', async (req, res) => {
  try {
    const userId = await getRequestUserIdOrFail(req, res);
    if (!userId) return;

    const { selections } = req.body;

    if (!Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ message: 'Selecoes invalidas' });
    }

    const { randomUUID } = require('crypto');
    const pendingDbStatus = await toDbStatus('pending');
    const quotedDbStatus = await toDbStatus('quoted');

    await db.query('BEGIN');

    let groups_created = 0;
    let orders_updated = 0;

    for (const sel of selections) {
      const { product_type, supplier_name, unit_price, freight_type, delivery_days, base_name, freight_cost_rl } = sel;
      if (!product_type || !supplier_name) continue;

      // Buscar pedidos pending deste produto para o usuario
      const pendingResult = await db.query(
        `SELECT id FROM orders WHERE user_id = $1 AND product_type = $2 AND status = $3`,
        [userId, product_type, pendingDbStatus]
      );

      if (pendingResult.rows.length === 0) continue;

      const orderIds = pendingResult.rows.map(r => r.id);
      const groupId = randomUUID();

      // Mover pedidos para quoted com o group_id do fornecedor selecionado
      await db.query(
        `UPDATE orders SET group_id = $1, status = $2, updated_at = NOW()
         WHERE id = ANY($3::int[]) AND user_id = $4`,
        [groupId, quotedDbStatus, orderIds, userId]
      );

      // Registrar cotacao do fornecedor selecionado
      const freightNote = freight_type ? `[${freight_type}] ` : '';
      const baseNote = withQuotationMeta(`${freightNote}Decisao de compra`, base_name, freight_cost_rl);
      await db.query(
        `INSERT INTO order_quotations (order_group_id, supplier_name, product_type, unit_price, total_price, delivery_days, notes)
         VALUES ($1, $2, $3, $4, 0, $5, $6)`,
        [groupId, supplier_name, product_type, unit_price || 0, delivery_days || 0, baseNote]
      );

      // Timeline para cada pedido
      const description = `Decisao de compra: ${supplier_name} R$ ${Number(unit_price || 0).toFixed(4)}/L${freight_type ? ' ' + freight_type : ''}`;
      for (const orderId of orderIds) {
        await db.query(
          `INSERT INTO order_timeline (order_id, status, description, created_by)
           VALUES ($1, 'quoted', $2, 'operador')`,
          [orderId, description]
        );
      }

      groups_created++;
      orders_updated += orderIds.length;
    }

    await db.query('COMMIT');

    res.json({ success: true, groups_created, orders_updated });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro na decisao de compra:', error);
    res.status(500).json({ message: 'Erro ao processar decisao de compra' });
  }
});

module.exports = router;

