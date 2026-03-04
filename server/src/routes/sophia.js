const express = require('express');
const {
  generatePassivaReply,
  generateAtivaMessage,
  sendOutboundMessage,
  assertInboundAuth,
  extractInboundPayload,
  searchEntity,
  insertCotacao,
  logSophiaMessage,
  getSophiaMessages,
  getSophiaSessions,
  loadPromptsFromWorkflow,
  AUTO_REPLY,
} = require('../services/sophia');
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

// Endpoint público de callback de cotações da Sophia
router.post('/quotation-callback', async (req, res) => {
  try {
    const webhookKey = req.headers['x-webhook-key'] || req.query.key;
    const expectedKey = process.env.SOPHIA_WEBHOOK_KEY;
    if (expectedKey && webhookKey !== expectedKey) {
      return res.status(401).json({ success: false, message: 'Webhook key inválida' });
    }

    const { group_id, quotations } = req.body || {};
    if (!group_id || !Array.isArray(quotations) || quotations.length === 0) {
      return res.status(400).json({ success: false, message: 'group_id e quotations são obrigatórios' });
    }

    await db.query('BEGIN');

    for (const q of quotations) {
      await db.query(
        `INSERT INTO order_quotations (order_group_id, supplier_name, product_type, unit_price, total_price, delivery_days, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [group_id, q.supplier_name, q.product_type, q.unit_price, q.total_price, q.delivery_days, q.notes]
      );
    }

    await db.query(
      `UPDATE orders SET status = 'quoted', updated_at = NOW() WHERE group_id = $1`,
      [group_id]
    );

    const orderIds = await db.query(
      'SELECT id FROM orders WHERE group_id = $1',
      [group_id]
    );

    for (const row of orderIds.rows) {
      await db.query(
        `INSERT INTO order_timeline (order_id, status, description, created_by)
         VALUES ($1, 'quoted', 'Cotações recebidas da Sophia via callback', 'sophia')`,
        [row.id]
      );
    }

    await db.query('COMMIT');

    return res.json({ success: true, group_id, quotations_saved: quotations.length });
  } catch (error) {
    try { await db.query('ROLLBACK'); } catch (_) {}
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar callback de cotações',
      details: error.message,
    });
  }
});

// Endpoint público para webhook de entrada (equivalente ao n8n Webhook node)
router.post('/webhook/sophia-gmtank', async (req, res) => {
  try {
    if (!assertInboundAuth(req)) {
      return res.status(401).json({ success: false, message: 'Webhook key inválida' });
    }

    const { number, message } = extractInboundPayload(req.body || {});
    if (!message) {
      return res.status(400).json({ success: false, message: 'Mensagem não encontrada no payload' });
    }

    const sessionId = number || `anon-${Date.now()}`;
    const result = await generatePassivaReply({ message, sessionId });
    await logSophiaMessage({
      sessionId,
      channel: 'webhook',
      direction: 'in',
      role: 'user',
      message,
    });
    await logSophiaMessage({
      sessionId,
      channel: 'webhook',
      direction: 'out',
      role: 'assistant',
      message: result.reply,
      provider: result.provider,
      model: result.model,
    });

    let outbound = null;
    if (AUTO_REPLY && number) {
      try {
        outbound = await sendOutboundMessage({ number, text: result.reply });
      } catch (error) {
        outbound = { error: error.message };
      }
    }

    return res.json({
      success: true,
      number,
      message,
      reply: result.reply,
      provider: result.provider,
      model: result.model,
      outbound,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar webhook da Sophia',
      details: error.message,
    });
  }
});

// Rotas internas autenticadas
router.use(authenticateToken);

router.post('/orders/process', async (req, res) => {
  try {
    const { group_id, postos, resumo } = req.body || {};
    if (!group_id) {
      return res.status(400).json({ success: false, message: 'group_id é obrigatório' });
    }

    const postosCount = Array.isArray(postos) ? postos.length : 0;
    const resumoText = resumo && typeof resumo === 'object' ? JSON.stringify(resumo) : '{}';
    const inboundText = `Novo lote de pedidos ${group_id} com ${postosCount} posto(s). Resumo: ${resumoText}`;

    await logSophiaMessage({
      userId: req.user.id,
      sessionId: `order-${group_id}`,
      channel: 'orders',
      direction: 'in',
      role: 'user',
      message: inboundText,
      metadata: { group_id, postos_count: postosCount },
    });

    const ackText = `Lote ${group_id} recebido. Vou acompanhar as cotações e atualizar o status quando houver retorno.`;
    await logSophiaMessage({
      userId: req.user.id,
      sessionId: `order-${group_id}`,
      channel: 'orders',
      direction: 'out',
      role: 'assistant',
      message: ackText,
      provider: 'internal',
      model: 'workflow',
      metadata: { group_id, postos_count: postosCount },
    });

    return res.json({
      success: true,
      mode: 'internal',
      group_id,
      message: ackText,
      postos_count: postosCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar lote interno da Sophia',
      details: error.message,
    });
  }
});

router.get('/workflow/summary', async (_req, res) => {
  const prompts = loadPromptsFromWorkflow();
  return res.json({
    success: true,
    prompts_loaded: true,
    passiva_chars: prompts.passiva.length,
    ativa_chars: prompts.ativa.length,
  });
});

router.post('/chat/passiva', async (req, res) => {
  try {
    const { message, sessionId } = req.body || {};
    if (!message) {
      return res.status(400).json({ success: false, message: 'Campo message é obrigatório' });
    }
    const result = await generatePassivaReply({
      message,
      sessionId: sessionId || `user-${req.user.id}`,
      userId: req.user.id,
    });
    const effectiveSession = sessionId || `user-${req.user.id}`;
    await logSophiaMessage({
      userId: req.user.id,
      sessionId: effectiveSession,
      channel: 'passiva',
      direction: 'in',
      role: 'user',
      message,
    });
    await logSophiaMessage({
      userId: req.user.id,
      sessionId: effectiveSession,
      channel: 'passiva',
      direction: 'out',
      role: 'assistant',
      message: result.reply,
      provider: result.provider,
      model: result.model,
    });
    return res.json({ success: true, ...result, sessionId: effectiveSession });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro no chat passivo da Sophia',
      details: error.message,
    });
  }
});

router.post('/cobranca/send', async (req, res) => {
  try {
    const { number, context, text } = req.body || {};
    if (!number) {
      return res.status(400).json({ success: false, message: 'Campo number é obrigatório' });
    }

    const generated = text
      ? { text, provider: 'manual', model: 'manual' }
      : await generateAtivaMessage({
      context: context || 'Gere mensagem de cobrança curta de cotação atrasada.',
      sessionId: `cobranca-${number}`,
      userId: req.user.id,
    });

    let outbound;
    let outboundError = null;
    try {
      outbound = await sendOutboundMessage({ number, text: generated.text });
    } catch (sendError) {
      outbound = { status: null, skipped: true };
      outboundError = sendError instanceof Error ? sendError.message : 'Falha ao enviar no canal externo';
    }
    const sessionId = `cobranca-${number}`;
    await logSophiaMessage({
      userId: req.user.id,
      sessionId,
      channel: 'cobranca',
      direction: 'out',
      role: 'assistant',
      message: generated.text,
      provider: generated.provider,
      model: generated.model,
      metadata: {
        number,
        outbound_status: outbound?.status || null,
        outbound_skipped: Boolean(outbound?.skipped),
        outbound_error: outboundError,
      },
    });
    return res.json({
      success: true,
      text: generated.text,
      provider: generated.provider,
      model: generated.model,
      outbound,
      warning: outboundError || outbound?.reason || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar cobrança ativa',
      details: error.message,
    });
  }
});

router.get('/select/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const { q, limit } = req.query;
    const rows = await searchEntity({ entity, q, limit, userId: req.user.id });
    return res.json({ success: true, count: rows.length, rows });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao consultar entidade',
      details: error.message,
    });
  }
});

router.get('/observability/messages', async (req, res) => {
  try {
    const { sessionId, limit } = req.query;
    const rows = await getSophiaMessages({
      userId: req.user.id,
      sessionId,
      limit,
    });
    return res.json({ success: true, count: rows.length, rows });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao consultar mensagens da Sophia',
      details: error.message,
    });
  }
});

router.get('/observability/sessions', async (req, res) => {
  try {
    const { limit } = req.query;
    const rows = await getSophiaSessions({
      userId: req.user.id,
      limit,
    });
    return res.json({ success: true, count: rows.length, rows });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao consultar sessões da Sophia',
      details: error.message,
    });
  }
});

router.post('/insert/cotacao', async (req, res) => {
  try {
    const row = await insertCotacao(req.body || {});
    return res.status(201).json({ success: true, row });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao inserir cotação',
      details: error.message,
    });
  }
});

module.exports = router;
