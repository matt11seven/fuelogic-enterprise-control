const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

router.use(authenticateToken);

// GET /api/postos
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, status } = req.query;

    let query = `
      SELECT
        p.*,
        COALESCE(NULLIF(TRIM(p.nome), ''), NULLIF(TRIM(p.cliente_gm), '')) AS nome_exibicao
      FROM postos p
      WHERE p.user_id = $1
    `;
    const params = [userId];

    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      query += ` AND (
        COALESCE(NULLIF(TRIM(p.nome), ''), NULLIF(TRIM(p.cliente_gm), '')) ILIKE $${params.length}
        OR p.cnpj ILIKE $${params.length}
      )`;
    }

    query += ` ORDER BY COALESCE(NULLIF(TRIM(p.nome), ''), NULLIF(TRIM(p.cliente_gm), '')), p.id`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar postos:', error);
    res.status(500).json({ message: 'Erro ao buscar postos' });
  }
});

// GET /api/postos/:id
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await db.query(
      `SELECT
         p.*,
         COALESCE(NULLIF(TRIM(p.nome), ''), NULLIF(TRIM(p.cliente_gm), '')) AS nome_exibicao
       FROM postos p
       WHERE p.id = $1 AND p.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Posto não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar posto:', error);
    res.status(500).json({ message: 'Erro ao buscar posto' });
  }
});

// GET /api/postos/:id/tanques
router.get('/:id/tanques', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const postoCheck = await db.query(
      'SELECT id FROM postos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (postoCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Posto não encontrado' });
    }

    const result = await db.query(
      'SELECT * FROM tanques WHERE posto_id = $1 ORDER BY numero_tanque',
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar tanques:', error);
    res.status(500).json({ message: 'Erro ao buscar tanques' });
  }
});

// POST /api/postos
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      nome, cnpj, erp, codigo_empresa_erp, id_unidade,
      cep, logradouro, numero, bairro, cidade, estado, status
    } = req.body;

    if (!nome) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    const result = await db.query(
      `INSERT INTO postos
       (user_id, nome, cnpj, erp, codigo_empresa_erp, id_unidade,
        cep, logradouro, numero, bairro, cidade, estado, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [userId, nome, cnpj, erp, codigo_empresa_erp, id_unidade,
       cep, logradouro, numero, bairro, cidade, estado, status || 'ativo']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar posto:', error);
    res.status(500).json({ message: 'Erro ao criar posto' });
  }
});

// PUT /api/postos/:id
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      nome, cnpj, erp, codigo_empresa_erp, id_unidade,
      cep, logradouro, numero, bairro, cidade, estado, status
    } = req.body;

    const check = await db.query(
      'SELECT id FROM postos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Posto não encontrado' });
    }

    const result = await db.query(
      `UPDATE postos SET
         nome=$1, cnpj=$2, erp=$3, codigo_empresa_erp=$4, id_unidade=$5,
         cep=$6, logradouro=$7, numero=$8, bairro=$9, cidade=$10, estado=$11,
         status=$12, updated_at=NOW()
       WHERE id=$13 AND user_id=$14
       RETURNING *`,
      [nome, cnpj, erp, codigo_empresa_erp, id_unidade,
       cep, logradouro, numero, bairro, cidade, estado,
       status, id, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar posto:', error);
    res.status(500).json({ message: 'Erro ao atualizar posto' });
  }
});

// DELETE /api/postos/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const check = await db.query(
      'SELECT id FROM postos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Posto não encontrado' });
    }

    await db.query(
      "UPDATE postos SET status='inativo', updated_at=NOW() WHERE id=$1 AND user_id=$2",
      [id, userId]
    );

    res.json({ message: 'Posto desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir posto:', error);
    res.status(500).json({ message: 'Erro ao excluir posto' });
  }
});

module.exports = router;
