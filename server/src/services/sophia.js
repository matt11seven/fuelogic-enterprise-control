const fs = require('fs');
const path = require('path');
const axios = require('axios');
const db = require('../db');

const DEFAULT_MODEL = process.env.SOPHIA_MODEL || 'gpt-4.1-mini';
const MEMORY_WINDOW = 20;
const OPENAI_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
const ANTHROPIC_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1/messages';
const OUTBOUND_URL = process.env.SOPHIA_OUTBOUND_URL || '';
const OUTBOUND_API_KEY = process.env.SOPHIA_OUTBOUND_API_KEY || '';
const INBOUND_WEBHOOK_KEY = process.env.SOPHIA_INBOUND_WEBHOOK_KEY || '';
const AUTO_REPLY = process.env.SOPHIA_AUTO_REPLY === 'true';

let promptsCache = null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value) {
  if (!value || typeof value !== 'string') return null;
  return UUID_REGEX.test(value) ? value : null;
}

function normalizePrompt(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.startsWith('=') ? raw.slice(1) : raw;
}

function loadPromptsFromWorkflow() {
  if (promptsCache) return promptsCache;

  const workflowPath = path.resolve(__dirname, '../../../docs/N8N Sophia New.json');
  const fallback = {
    passiva:
      'Você é Sophia, compradora de combustíveis da rede SLING. Colete fornecedor, combustível, base, frete (CIF/FOB) e preço.',
    ativa:
      'Você é Sophia e deve cobrar cotações atrasadas com urgência, em tom cordial e direto.',
  };

  try {
    if (!fs.existsSync(workflowPath)) {
      promptsCache = fallback;
      return promptsCache;
    }

    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
    const passivaNode = nodes.find((n) => n.name === 'Sophia Passiva');
    const ativaNode = nodes.find((n) => n.name === 'Sophia Ativa');

    const passiva = normalizePrompt(passivaNode?.parameters?.options?.systemMessage) || fallback.passiva;
    const ativa = normalizePrompt(ativaNode?.parameters?.options?.systemMessage) || fallback.ativa;

    promptsCache = { passiva, ativa };
    return promptsCache;
  } catch {
    promptsCache = fallback;
    return promptsCache;
  }
}

function getOpenAiKey() {
  return process.env.SOPHIA_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
}

async function ensureSophiaConfigTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS sophia_configuracoes (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(30) NOT NULL DEFAULT 'openai',
      model VARCHAR(120) NOT NULL DEFAULT 'gpt-4.1-mini',
      openai_api_key TEXT,
      openrouter_api_key TEXT,
      anthropic_api_key TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function ensureSophiaObservabilityTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS sophia_conversas (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      session_id VARCHAR(120) NOT NULL,
      channel VARCHAR(40) NOT NULL DEFAULT 'passiva',
      direction VARCHAR(10) NOT NULL,
      role VARCHAR(30) NOT NULL,
      message TEXT NOT NULL,
      provider VARCHAR(30) NULL,
      model VARCHAR(120) NULL,
      metadata JSONB NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function logSophiaMessage({
  userId = null,
  sessionId,
  channel = 'passiva',
  direction,
  role,
  message,
  provider = null,
  model = null,
  metadata = null,
}) {
  if (!sessionId || !message) return;
  await ensureSophiaObservabilityTable();
  const safeUserId = normalizeUuid(userId);
  await db.query(
    `
      INSERT INTO sophia_conversas
        (user_id, session_id, channel, direction, role, message, provider, model, metadata)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    `,
    [
      safeUserId,
      String(sessionId),
      String(channel),
      String(direction || 'in'),
      String(role || 'user'),
      String(message),
      provider,
      model,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
}

async function getSophiaMessages({ userId, sessionId, limit = 100 }) {
  await ensureSophiaObservabilityTable();
  const safeUserId = normalizeUuid(userId);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  if (sessionId) {
    const result = await db.query(
      `
        SELECT id, user_id, session_id, channel, direction, role, message, provider, model, metadata, created_at
        FROM sophia_conversas
        WHERE session_id = $1 AND ($2::uuid IS NULL OR user_id = $2::uuid)
        ORDER BY id DESC
        LIMIT $3
      `,
      [sessionId, safeUserId, safeLimit],
    );
    return result.rows.reverse();
  }

  const result = await db.query(
    `
      SELECT id, user_id, session_id, channel, direction, role, message, provider, model, metadata, created_at
      FROM sophia_conversas
      WHERE ($1::uuid IS NULL OR user_id = $1::uuid)
      ORDER BY id DESC
      LIMIT $2
    `,
    [safeUserId, safeLimit],
  );
  return result.rows.reverse();
}

async function getSophiaSessions({ userId, limit = 50 }) {
  await ensureSophiaObservabilityTable();
  const safeUserId = normalizeUuid(userId);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const result = await db.query(
    `
      SELECT
        session_id,
        MAX(created_at) AS last_message_at,
        COUNT(*)::int AS total_messages,
        MAX(provider) AS provider,
        MAX(model) AS model
      FROM sophia_conversas
      WHERE ($1::uuid IS NULL OR user_id = $1::uuid)
      GROUP BY session_id
      ORDER BY last_message_at DESC
      LIMIT $2
    `,
    [safeUserId, safeLimit],
  );
  return result.rows;
}

async function getUserSophiaConfig(userId) {
  const safeUserId = normalizeUuid(userId);
  if (!safeUserId) return null;
  await ensureSophiaConfigTable();
  const result = await db.query(
    `
      SELECT provider, model, openai_api_key, openrouter_api_key, anthropic_api_key
      FROM sophia_configuracoes
      WHERE user_id = $1
    `,
    [safeUserId],
  );
  return result.rows[0] || null;
}

async function resolveLlmConfig(userId, requestedModel) {
  const userConfig = await getUserSophiaConfig(userId);
  const provider = userConfig?.provider || 'openai';
  const model = requestedModel || userConfig?.model || DEFAULT_MODEL;

  if (provider === 'openrouter') {
    const apiKey = userConfig?.openrouter_api_key || process.env.OPENROUTER_API_KEY || '';
    return { provider, model, apiKey, url: OPENROUTER_URL };
  }

  if (provider === 'anthropic') {
    const apiKey = userConfig?.anthropic_api_key || process.env.ANTHROPIC_API_KEY || '';
    return { provider, model, apiKey, url: ANTHROPIC_URL };
  }

  const apiKey = userConfig?.openai_api_key || getOpenAiKey();
  return { provider: 'openai', model, apiKey, url: OPENAI_URL };
}

async function getPersistentMemory(sessionId, userId) {
  await ensureSophiaObservabilityTable();
  const safeSessionId = String(sessionId || '').trim();
  if (!safeSessionId) return [];

  const safeUserId = normalizeUuid(userId);
  const result = await db.query(
    `
      SELECT role, message
      FROM sophia_conversas
      WHERE session_id = $1
        AND role IN ('user', 'assistant')
        AND ($2::uuid IS NULL OR user_id = $2::uuid)
      ORDER BY id DESC
      LIMIT $3
    `,
    [safeSessionId, safeUserId, MEMORY_WINDOW],
  );

  return result.rows
    .reverse()
    .map((row) => ({ role: row.role, content: row.message }))
    .filter((row) => row.content && typeof row.content === 'string');
}

async function callLlm(systemPrompt, userMessage, sessionId, model, userId) {
  const llm = await resolveLlmConfig(userId, model);
  const apiKey = llm.apiKey;
  if (!apiKey) {
    return {
      text: 'Não consegui acessar o modelo agora (chave não configurada). Pode me enviar fornecedor, combustível, base, frete e preço que registro manualmente.',
      provider: llm.provider,
      model: llm.model,
    };
  }

  const history = await getPersistentMemory(sessionId, userId);
  const messages = [{ role: 'system', content: systemPrompt }, ...history];
  if (userMessage) {
    messages.push({ role: 'user', content: userMessage });
  }

  let text = '';
  if (llm.provider === 'anthropic') {
    const cleanMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
    const response = await axios.post(
      llm.url,
      {
        model: llm.model || 'claude-3-5-sonnet-latest',
        max_tokens: 600,
        system: systemPrompt,
        messages: cleanMessages,
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );
    text = response?.data?.content?.[0]?.text || '';
  } else {
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    if (llm.provider === 'openrouter') {
      headers['HTTP-Referer'] = process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:8080';
      headers['X-Title'] = process.env.OPENROUTER_APP_TITLE || 'Fuelogic Sophia';
    }

    const response = await axios.post(
      llm.url,
      {
        model: llm.model,
        temperature: 0.2,
        messages,
      },
      {
        headers,
        timeout: 30000,
      },
    );
    text = response?.data?.choices?.[0]?.message?.content || '';
  }

  return {
    text: typeof text === 'string' && text.trim() ? text.trim() : 'Sem resposta do modelo.',
    provider: llm.provider,
    model: llm.model,
  };
}

async function generatePassivaReply({ message, sessionId, userId }) {
  const prompts = loadPromptsFromWorkflow();
  const result = await callLlm(prompts.passiva, message, sessionId, undefined, userId);
  return {
    reply: result.text,
    provider: result.provider,
    model: result.model,
  };
}

async function generateAtivaMessage({ context, sessionId, userId }) {
  const prompts = loadPromptsFromWorkflow();
  const seed = context || 'Gere uma mensagem curta de cobrança de cotação atrasada.';
  const result = await callLlm(
    prompts.ativa,
    seed,
    sessionId || `ativa-${Date.now()}`,
    undefined,
    userId,
  );
  return {
    text: result.text,
    provider: result.provider,
    model: result.model,
  };
}

async function sendOutboundMessage({ number, text }) {
  if (!OUTBOUND_URL) {
    return {
      status: null,
      skipped: true,
      reason: 'SOPHIA_OUTBOUND_URL não configurada',
    };
  }
  if (!number) {
    throw new Error('Número de destino não informado');
  }

  const headers = {
    'Content-Type': 'application/json',
  };
  if (OUTBOUND_API_KEY) {
    headers.apikey = OUTBOUND_API_KEY;
  }

  const response = await axios.post(
    OUTBOUND_URL,
    { number, text },
    { headers, timeout: 20000 },
  );

  return {
    status: response.status,
    data: response.data,
    skipped: false,
  };
}

function assertInboundAuth(req) {
  if (!INBOUND_WEBHOOK_KEY) return true;
  const token = req.headers['x-sophia-key'];
  return token && token === INBOUND_WEBHOOK_KEY;
}

function extractInboundPayload(body) {
  const number =
    body?.number ||
    body?.from ||
    body?.phone ||
    body?.contact?.phone ||
    body?.data?.from ||
    '';

  const message =
    body?.text ||
    body?.message ||
    body?.body ||
    body?.data?.text ||
    body?.messages?.[0]?.text ||
    '';

  return {
    number: String(number || '').trim(),
    message: String(message || '').trim(),
  };
}

function getWhitelistedEntity(entity) {
  const map = {
    bases: { table: 'bases', columns: 'id, nome_base, nomenclaturas_base' },
    combustiveis: { table: 'combustiveis', columns: 'id, nome_combustivel, nomenclaturas_combustivel' },
    fornecedores: { table: 'fornecedores', columns: 'id, telefone, nome_fornecedor, empresa' },
  };
  return map[entity] || null;
}

async function searchEntity({ entity, q, limit = 20, userId = null }) {
  if (entity === 'postos') {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 200));
    const search = `%${q || ''}%`;
    const safeUser = userId ? String(userId) : null;

    const result = await db.query(
      `
      SELECT DISTINCT nome_posto
      FROM (
        SELECT COALESCE(NULLIF(TRIM(p.nome), ''), NULLIF(TRIM(p.cliente_gm), '')) AS nome_posto
        FROM postos p
        WHERE COALESCE(NULLIF(TRIM(p.nome), ''), NULLIF(TRIM(p.cliente_gm), '')) IS NOT NULL
          AND COALESCE(NULLIF(TRIM(p.nome), ''), NULLIF(TRIM(p.cliente_gm), '')) ILIKE $1
          AND ($3::text IS NULL OR CAST(p.user_id AS text) = $3::text)

        UNION

        SELECT o.station_name AS nome_posto
        FROM orders o
        WHERE o.station_name IS NOT NULL
          AND o.station_name ILIKE $1
          AND ($3::text IS NULL OR CAST(o.user_id AS text) = $3::text)
      ) src
      ORDER BY nome_posto ASC
      LIMIT $2
      `,
      [search, safeLimit, safeUser],
    );

    return result.rows;
  }

  const entry = getWhitelistedEntity(entity);
  if (!entry) {
    throw new Error(`Entidade inválida: ${entity}`);
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const search = `%${q || ''}%`;

  let query;
  if (entity === 'bases') {
    query = `SELECT ${entry.columns} FROM ${entry.table} WHERE nome_base ILIKE $1 ORDER BY id DESC LIMIT $2`;
  } else if (entity === 'combustiveis') {
    query = `SELECT ${entry.columns} FROM ${entry.table} WHERE nome_combustivel ILIKE $1 ORDER BY id DESC LIMIT $2`;
  } else {
    query = `SELECT ${entry.columns} FROM ${entry.table} WHERE empresa ILIKE $1 OR nome_fornecedor ILIKE $1 OR telefone ILIKE $1 ORDER BY id DESC LIMIT $2`;
  }

  const result = await db.query(query, [search, safeLimit]);
  return result.rows;
}

async function insertCotacao(payload) {
  const { fornecedor_telefone, fornecedor_nome, base_nome, tipo_frete, combustivel, preco } = payload;
  if (!fornecedor_telefone || !fornecedor_nome || !base_nome || !tipo_frete || !combustivel || preco == null) {
    throw new Error('Campos obrigatórios: fornecedor_telefone, fornecedor_nome, base_nome, tipo_frete, combustivel, preco');
  }

  const sql = `
    INSERT INTO cotacoes (
      fornecedor_telefone,
      fornecedor_nome,
      base_nome,
      tipo_frete,
      combustivel,
      preco,
      data_registro
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `;

  const result = await db.query(sql, [
    String(fornecedor_telefone),
    String(fornecedor_nome),
    String(base_nome),
    String(tipo_frete).toUpperCase(),
    String(combustivel),
    Number(preco),
  ]);
  return result.rows[0];
}

module.exports = {
  loadPromptsFromWorkflow,
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
  AUTO_REPLY,
};
