const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

// Middleware para autenticação em todas as rotas
router.use(authenticateToken);

// GET /api/trucks - Listar todos os caminhões do usuário
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      'SELECT * FROM trucks WHERE user_id = $1 ORDER BY name',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar caminhões:', error);
    res.status(500).json({ message: 'Erro ao buscar caminhões' });
  }
});

// GET /api/trucks/search - Buscar caminhões por termo
router.get('/search', async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Termo de busca não fornecido' });
    }

    const result = await db.query(
      `SELECT * FROM trucks 
       WHERE user_id = $1 
       AND (
         name ILIKE $2 OR 
         driver_name ILIKE $2 OR 
         license_plate ILIKE $2
       )
       ORDER BY name`,
      [userId, `%${q}%`]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar caminhões:', error);
    res.status(500).json({ message: 'Erro ao buscar caminhões' });
  }
});

// GET /api/trucks/:id - Obter um caminhão específico
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const truckId = req.params.id;
    
    const result = await db.query(
      'SELECT * FROM trucks WHERE id = $1 AND user_id = $2',
      [truckId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Caminhão não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar caminhão:', error);
    res.status(500).json({ message: 'Erro ao buscar caminhão' });
  }
});

// POST /api/trucks - Criar um novo caminhão
router.post('/', async (req, res) => {
  try {
    // Iniciar transação
    await db.query('BEGIN');
    
    const userId = req.user.id;
    const { name, driver_name, license_plate, capacity, observations, status } = req.body;
    
    console.log('[DEBUG] Dados recebidos para criar caminhão:', { 
      userId,
      name, 
      driver_name, 
      license_plate, 
      capacity, 
      observations, 
      status 
    });
    
    // Validações básicas
    if (!name || !driver_name || !license_plate || !capacity) {
      return res.status(400).json({ message: 'Dados incompletos' });
    }
    
    // Inserir o caminhão
    const result = await db.query(
      `INSERT INTO trucks 
       (user_id, name, driver_name, license_plate, capacity, observations, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [userId, name, driver_name, license_plate, capacity, observations, status || 'active']
    );
    
    const newTruck = result.rows[0];
    
    // Registrar no histórico
    await db.query(
      `INSERT INTO truck_history 
       (truck_id, user_id, change_type, field_name, old_value, new_value) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newTruck.id, userId, 'create', null, null, JSON.stringify(newTruck)]
    );
    
    await db.query('COMMIT');
    res.status(201).json(newTruck);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao criar caminhão:', error);
    
    // Verificar se é erro de violação de chave única (placa já cadastrada)
    if (error.code === '23505' && error.constraint === 'trucks_license_plate_key') {
      return res.status(400).json({ message: 'Placa já cadastrada' });
    }
    
    res.status(500).json({ message: 'Erro ao criar caminhão' });
  }
});

// PUT /api/trucks/:id - Atualizar um caminhão existente
router.put('/:id', async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    const truckId = req.params.id;
    const { name, driver_name, license_plate, capacity, observations, status } = req.body;
    
    // Buscar o caminhão atual para comparar alterações
    const currentResult = await client.query(
      'SELECT * FROM trucks WHERE id = $1 AND user_id = $2',
      [truckId, userId]
    );
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Caminhão não encontrado' });
    }
    
    const currentTruck = currentResult.rows[0];
    
    // Atualizar o caminhão
    const result = await client.query(
      `UPDATE trucks 
       SET name = $1, 
           driver_name = $2, 
           license_plate = $3, 
           capacity = $4, 
           observations = $5, 
           status = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [name, driver_name, license_plate, capacity, observations, status, truckId, userId]
    );
    
    const updatedTruck = result.rows[0];
    
    // Registrar alterações no histórico
    const fieldsToTrack = [
      { name: 'name', oldValue: currentTruck.name, newValue: name },
      { name: 'driver_name', oldValue: currentTruck.driver_name, newValue: driver_name },
      { name: 'license_plate', oldValue: currentTruck.license_plate, newValue: license_plate },
      { name: 'capacity', oldValue: currentTruck.capacity, newValue: capacity },
      { name: 'observations', oldValue: currentTruck.observations, newValue: observations },
      { name: 'status', oldValue: currentTruck.status, newValue: status }
    ];
    
    // Registrar apenas os campos que foram alterados
    for (const field of fieldsToTrack) {
      if (field.oldValue !== field.newValue) {
        await client.query(
          `INSERT INTO truck_history 
           (truck_id, user_id, change_type, field_name, old_value, new_value) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [truckId, userId, 'update', field.name, String(field.oldValue), String(field.newValue)]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json(updatedTruck);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar caminhão:', error);
    
    // Verificar se é erro de violação de chave única (placa já cadastrada)
    if (error.code === '23505' && error.constraint === 'trucks_license_plate_key') {
      return res.status(400).json({ message: 'Placa já cadastrada' });
    }
    
    res.status(500).json({ message: 'Erro ao atualizar caminhão' });
  } finally {
    client.release();
  }
});

// DELETE /api/trucks/:id - Excluir um caminhão
router.delete('/:id', async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    const truckId = req.params.id;
    
    // Verificar se o caminhão pertence ao usuário e obter dados para histórico
    const checkResult = await client.query(
      'SELECT * FROM trucks WHERE id = $1 AND user_id = $2',
      [truckId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Caminhão não encontrado' });
    }
    
    const truckData = checkResult.rows[0];
    
    // Registrar a exclusão no histórico antes de excluir o caminhão
    await client.query(
      `INSERT INTO truck_history 
       (truck_id, user_id, change_type, field_name, old_value, new_value) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [truckId, userId, 'delete', null, JSON.stringify(truckData), null]
    );
    
    // Excluir o caminhão
    await client.query(
      'DELETE FROM trucks WHERE id = $1 AND user_id = $2',
      [truckId, userId]
    );
    
    await client.query('COMMIT');
    res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir caminhão:', error);
    res.status(500).json({ message: 'Erro ao excluir caminhão' });
  } finally {
    client.release();
  }
});

// GET /api/trucks/:id/history - Obter histórico de alterações de um caminhão
router.get('/:id/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const truckId = req.params.id;
    
    // Verificar se o caminhão pertence ao usuário
    const checkResult = await db.query(
      'SELECT id FROM trucks WHERE id = $1 AND user_id = $2',
      [truckId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      // Verificar se o caminhão existiu mas foi excluído
      const historyCheck = await db.query(
        'SELECT id FROM truck_history WHERE truck_id = $1 AND user_id = $2 LIMIT 1',
        [truckId, userId]
      );
      
      if (historyCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Caminhão não encontrado' });
      }
    }
    
    // Buscar o histórico de alterações
    const historyResult = await db.query(
      `SELECT * FROM truck_history 
       WHERE truck_id = $1 AND user_id = $2 
       ORDER BY created_at DESC`,
      [truckId, userId]
    );
    
    res.json(historyResult.rows);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ message: 'Erro ao buscar histórico de alterações' });
  }
});

module.exports = router;
