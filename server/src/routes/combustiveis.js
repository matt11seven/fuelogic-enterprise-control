const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

router.use(authenticateToken);

// GET /api/combustiveis - Catálogo do usuário
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      "SELECT * FROM combustiveis WHERE user_id = $1 AND status != 'inativo' ORDER BY nome",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar combustíveis:', error);
    res.status(500).json({ message: 'Erro ao buscar combustíveis' });
  }
});

// GET /api/combustiveis/posto/:postoId - Vínculos do posto
router.get('/posto/:postoId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postoId } = req.params;

    const postoCheck = await db.query(
      'SELECT id FROM postos WHERE id = $1 AND user_id = $2',
      [postoId, userId]
    );

    if (postoCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Posto não encontrado' });
    }

    const result = await db.query(
      `SELECT pc.*, c.nome, c.codigo, c.unidade
       FROM posto_combustiveis pc
       JOIN combustiveis c ON c.id = pc.combustivel_id
       WHERE pc.posto_id = $1
       ORDER BY c.nome`,
      [postoId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar combustíveis do posto:', error);
    res.status(500).json({ message: 'Erro ao buscar combustíveis do posto' });
  }
});

// POST /api/combustiveis - Criar tipo
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, codigo, unidade, status } = req.body;

    if (!nome) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    const result = await db.query(
      `INSERT INTO combustiveis (user_id, nome, codigo, unidade, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, nome, codigo, unidade || 'litros', status || 'ativo']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar combustível:', error);
    res.status(500).json({ message: 'Erro ao criar combustível' });
  }
});

// PUT /api/combustiveis/:id - Atualizar
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { nome, codigo, unidade, status } = req.body;

    const check = await db.query(
      'SELECT id FROM combustiveis WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Combustível não encontrado' });
    }

    const result = await db.query(
      `UPDATE combustiveis SET nome=$1, codigo=$2, unidade=$3, status=$4, updated_at=NOW()
       WHERE id=$5 AND user_id=$6
       RETURNING *`,
      [nome, codigo, unidade, status, id, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar combustível:', error);
    res.status(500).json({ message: 'Erro ao atualizar combustível' });
  }
});

// DELETE /api/combustiveis/:id - Desativar
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const check = await db.query(
      'SELECT id FROM combustiveis WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Combustível não encontrado' });
    }

    await db.query(
      "UPDATE combustiveis SET status='inativo', updated_at=NOW() WHERE id=$1 AND user_id=$2",
      [id, userId]
    );

    res.json({ message: 'Combustível desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar combustível:', error);
    res.status(500).json({ message: 'Erro ao desativar combustível' });
  }
});

// POST /api/combustiveis/posto/:postoId - Vincular combustível a posto
router.post('/posto/:postoId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postoId } = req.params;
    const { combustivel_id, codigo_erp } = req.body;

    const postoCheck = await db.query(
      'SELECT id FROM postos WHERE id = $1 AND user_id = $2',
      [postoId, userId]
    );

    if (postoCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Posto não encontrado' });
    }

    const result = await db.query(
      `INSERT INTO posto_combustiveis (posto_id, combustivel_id, codigo_erp)
       VALUES ($1, $2, $3)
       ON CONFLICT (posto_id, combustivel_id) DO UPDATE SET codigo_erp = EXCLUDED.codigo_erp
       RETURNING *`,
      [postoId, combustivel_id, codigo_erp]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao vincular combustível:', error);
    res.status(500).json({ message: 'Erro ao vincular combustível' });
  }
});

// PUT /api/combustiveis/posto/:postoId/:id - Atualizar código ERP do vínculo
router.put('/posto/:postoId/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postoId, id } = req.params;
    const { codigo_erp } = req.body;

    const postoCheck = await db.query(
      'SELECT id FROM postos WHERE id = $1 AND user_id = $2',
      [postoId, userId]
    );

    if (postoCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Posto não encontrado' });
    }

    const result = await db.query(
      `UPDATE posto_combustiveis SET codigo_erp=$1
       WHERE id=$2 AND posto_id=$3
       RETURNING *`,
      [codigo_erp, id, postoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vínculo não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar vínculo:', error);
    res.status(500).json({ message: 'Erro ao atualizar vínculo' });
  }
});

// DELETE /api/combustiveis/posto/:postoId/:id - Remover vínculo
router.delete('/posto/:postoId/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postoId, id } = req.params;

    const postoCheck = await db.query(
      'SELECT id FROM postos WHERE id = $1 AND user_id = $2',
      [postoId, userId]
    );

    if (postoCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Posto não encontrado' });
    }

    await db.query(
      'DELETE FROM posto_combustiveis WHERE id=$1 AND posto_id=$2',
      [id, postoId]
    );

    res.json({ message: 'Vínculo removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover vínculo:', error);
    res.status(500).json({ message: 'Erro ao remover vínculo' });
  }
});

module.exports = router;
