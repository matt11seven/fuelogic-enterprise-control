/**
 * Rota para gerenciar configurações do sistema
 * Incluindo thresholds de prioridade para tanques e pedidos
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const SOPHIA_DEFAULTS = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  openai_api_key: '',
  openrouter_api_key: '',
  anthropic_api_key: '',
};

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

/**
 * @route GET /api/configurations
 * @desc Obter as configurações do usuário atual
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Busca as configurações do usuário
    const query = `
      SELECT id, threshold_critico, threshold_atencao
      FROM configuracoes 
      WHERE user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    
    // Se não existir configuração para este usuário, retorna os valores padrão
    if (result.rows.length === 0) {
      return res.json({
        threshold_critico: 20,
        threshold_atencao: 50
      });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

/**
 * @route PUT /api/configurations
 * @desc Atualizar as configurações do usuário atual
 * @access Private
 */
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { threshold_critico, threshold_atencao } = req.body;
    
    // Validações básicas
    if (threshold_critico < 0 || threshold_critico > 100) {
      return res.status(400).json({ error: 'Threshold crítico deve estar entre 0 e 100%' });
    }
    
    if (threshold_atencao < 0 || threshold_atencao > 100) {
      return res.status(400).json({ error: 'Threshold de atenção deve estar entre 0 e 100%' });
    }
    
    if (threshold_critico >= threshold_atencao) {
      return res.status(400).json({ error: 'Threshold crítico deve ser menor que threshold de atenção' });
    }
    
    // Verifica se já existe configuração para este usuário
    const checkQuery = 'SELECT id FROM configuracoes WHERE user_id = $1';
    const checkResult = await db.query(checkQuery, [userId]);
    
    let result;
    
    if (checkResult.rows.length > 0) {
      // Atualiza configuração existente
      const updateQuery = `
        UPDATE configuracoes 
        SET threshold_critico = $1, threshold_atencao = $2
        WHERE user_id = $3
        RETURNING id, threshold_critico, threshold_atencao
      `;
      result = await db.query(updateQuery, [threshold_critico, threshold_atencao, userId]);
    } else {
      // Cria nova configuração
      const insertQuery = `
        INSERT INTO configuracoes (user_id, threshold_critico, threshold_atencao)
        VALUES ($1, $2, $3)
        RETURNING id, threshold_critico, threshold_atencao
      `;
      result = await db.query(insertQuery, [userId, threshold_critico, threshold_atencao]);
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

/**
 * @route GET /api/configurations/sophia
 * @desc Obter configurações da Sophia para o usuário atual
 * @access Private
 */
router.get('/sophia', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await ensureSophiaConfigTable();

    const result = await db.query(
      `
      SELECT provider, model, openai_api_key, openrouter_api_key, anthropic_api_key
      FROM sophia_configuracoes
      WHERE user_id = $1
      `,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.json(SOPHIA_DEFAULTS);
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar configurações da Sophia:', error);
    return res.status(500).json({ error: 'Erro ao buscar configurações da Sophia' });
  }
});

/**
 * @route PUT /api/configurations/sophia
 * @desc Atualizar configurações da Sophia para o usuário atual
 * @access Private
 */
router.put('/sophia', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      provider,
      model,
      openai_api_key = '',
      openrouter_api_key = '',
      anthropic_api_key = '',
    } = req.body;

    const allowedProviders = ['openai', 'openrouter', 'anthropic'];
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ error: 'Provider inválido. Use openai, openrouter ou anthropic.' });
    }

    if (!model || typeof model !== 'string' || model.trim().length < 2) {
      return res.status(400).json({ error: 'Model é obrigatório.' });
    }

    await ensureSophiaConfigTable();

    const result = await db.query(
      `
      INSERT INTO sophia_configuracoes (
        user_id, provider, model, openai_api_key, openrouter_api_key, anthropic_api_key
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id)
      DO UPDATE SET
        provider = EXCLUDED.provider,
        model = EXCLUDED.model,
        openai_api_key = EXCLUDED.openai_api_key,
        openrouter_api_key = EXCLUDED.openrouter_api_key,
        anthropic_api_key = EXCLUDED.anthropic_api_key,
        updated_at = CURRENT_TIMESTAMP
      RETURNING provider, model, openai_api_key, openrouter_api_key, anthropic_api_key
      `,
      [userId, provider, model.trim(), openai_api_key, openrouter_api_key, anthropic_api_key],
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar configurações da Sophia:', error);
    return res.status(500).json({ error: 'Erro ao atualizar configurações da Sophia' });
  }
});

/**
 * @route GET /api/configurations/status
 * @desc Calculcar status de um tanque baseado nas configurações
 * @access Private
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { percentual } = req.query;
    
    if (!percentual) {
      return res.status(400).json({ error: 'Percentual é obrigatório' });
    }
    
    const numPercentual = parseFloat(percentual);
    
    // Chama a função que criamos na migration para calcular o status
    const query = `
      SELECT calcular_status_tanque($1, $2) as status
    `;
    
    const result = await db.query(query, [userId, numPercentual]);
    return res.json({ status: result.rows[0].status });
    
  } catch (error) {
    console.error('Erro ao calcular status:', error);
    return res.status(500).json({ error: 'Erro ao calcular status' });
  }
});

module.exports = router;
