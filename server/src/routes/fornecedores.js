const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

router.use(authenticateToken);

// GET /api/fornecedores
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, status } = req.query;

    let query = 'SELECT * FROM fornecedores WHERE user_id = $1';
    const params = [userId];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      query += ` AND (razao_social ILIKE $${params.length} OR nome_fantasia ILIKE $${params.length} OR cnpj ILIKE $${params.length})`;
    }

    query += ' ORDER BY razao_social';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    res.status(500).json({ message: 'Erro ao buscar fornecedores' });
  }
});

// GET /api/fornecedores/:id
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const fornResult = await db.query(
      'SELECT * FROM fornecedores WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (fornResult.rows.length === 0) {
      return res.status(404).json({ message: 'Fornecedor não encontrado' });
    }

    const combustiveisResult = await db.query(
      `SELECT c.* FROM combustiveis c
       JOIN fornecedor_combustiveis fc ON fc.combustivel_id = c.id
       WHERE fc.fornecedor_id = $1`,
      [id]
    );

    const fornecedor = fornResult.rows[0];
    fornecedor.combustiveis = combustiveisResult.rows;

    res.json(fornecedor);
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    res.status(500).json({ message: 'Erro ao buscar fornecedor' });
  }
});

// POST /api/fornecedores
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      razao_social, nome_fantasia, cnpj, telefone, email,
      contato_comercial, prazo_entrega_dias, observacoes, status,
      combustivel_ids
    } = req.body;

    if (!razao_social) {
      return res.status(400).json({ message: 'Razão social é obrigatória' });
    }

    await db.query('BEGIN');

    const result = await db.query(
      `INSERT INTO fornecedores
       (user_id, razao_social, nome_fantasia, cnpj, telefone, email,
        contato_comercial, prazo_entrega_dias, observacoes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [userId, razao_social, nome_fantasia, cnpj, telefone, email,
       contato_comercial, prazo_entrega_dias, observacoes, status || 'ativo']
    );

    const fornecedor = result.rows[0];

    if (Array.isArray(combustivel_ids) && combustivel_ids.length > 0) {
      for (const cid of combustivel_ids) {
        await db.query(
          'INSERT INTO fornecedor_combustiveis (fornecedor_id, combustivel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [fornecedor.id, cid]
        );
      }
    }

    await db.query('COMMIT');
    res.status(201).json(fornecedor);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao criar fornecedor:', error);
    res.status(500).json({ message: 'Erro ao criar fornecedor' });
  }
});

// PUT /api/fornecedores/:id
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      razao_social, nome_fantasia, cnpj, telefone, email,
      contato_comercial, prazo_entrega_dias, observacoes, status,
      combustivel_ids
    } = req.body;

    const check = await db.query(
      'SELECT id FROM fornecedores WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Fornecedor não encontrado' });
    }

    await db.query('BEGIN');

    const result = await db.query(
      `UPDATE fornecedores SET
         razao_social=$1, nome_fantasia=$2, cnpj=$3, telefone=$4, email=$5,
         contato_comercial=$6, prazo_entrega_dias=$7, observacoes=$8,
         status=$9, updated_at=NOW()
       WHERE id=$10 AND user_id=$11
       RETURNING *`,
      [razao_social, nome_fantasia, cnpj, telefone, email,
       contato_comercial, prazo_entrega_dias, observacoes,
       status, id, userId]
    );

    if (Array.isArray(combustivel_ids)) {
      await db.query('DELETE FROM fornecedor_combustiveis WHERE fornecedor_id = $1', [id]);
      for (const cid of combustivel_ids) {
        await db.query(
          'INSERT INTO fornecedor_combustiveis (fornecedor_id, combustivel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, cid]
        );
      }
    }

    await db.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ message: 'Erro ao atualizar fornecedor' });
  }
});

// DELETE /api/fornecedores/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const check = await db.query(
      'SELECT id FROM fornecedores WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Fornecedor não encontrado' });
    }

    await db.query(
      "UPDATE fornecedores SET status='inativo', updated_at=NOW() WHERE id=$1 AND user_id=$2",
      [id, userId]
    );

    res.json({ message: 'Fornecedor desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir fornecedor:', error);
    res.status(500).json({ message: 'Erro ao excluir fornecedor' });
  }
});

module.exports = router;
