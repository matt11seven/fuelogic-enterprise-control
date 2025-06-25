const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Helper para verificar token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ message: 'Token não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};

/**
 * Rota de login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
    }
    
    // Verificar credenciais master (fallback)
    const isMasterUser = process.env.MASTER_USERNAME === username && 
                         process.env.MASTER_PASSWORD === password;
    
    if (isMasterUser) {
      // Usuário master (de emergência)
      const user = {
        id: 'master-user',
        username: process.env.MASTER_USERNAME,
        email: 'admin@fuelogic.com',
        role: 'admin',
        apiKey: process.env.MASTER_API_KEY
      };
      
      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
      
      // Registrar acesso
      await db.logAccess(user.id, 'login-master', req.ip, req.get('user-agent'));
      
      return res.json({
        ...user,
        token
      });
    }
    
    // Buscar usuário no banco
    const userData = await db.authenticateUser(username, password);
    
    if (!userData) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Remover senha do objeto antes de enviar
    delete userData.password_hash;
    
    // Gerar token JWT
    const token = jwt.sign(
      { id: userData.id, username: userData.username, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    // Registrar acesso
    await db.logAccess(userData.id, 'login', req.ip, req.get('user-agent'));
    
    return res.json({
      ...userData,
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

/**
 * Rota para obter a API key do usuário master
 */
router.get('/master-api-key', async (req, res) => {
  try {
    const apiKey = await db.getMasterApiKey();
    
    if (!apiKey) {
      return res.status(404).json({ message: 'API key não encontrada' });
    }
    
    return res.json({ apiKey });
  } catch (error) {
    console.error('Erro ao buscar API key:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

/**
 * Rota para registrar acesso no log
 */
router.post('/log-access', verifyToken, async (req, res) => {
  try {
    const { userId, action, ipAddress, userAgent } = req.body;
    
    if (!userId || !action) {
      return res.status(400).json({ message: 'Usuário e ação são obrigatórios' });
    }
    
    await db.logAccess(userId, action, ipAddress, userAgent);
    
    return res.status(201).json({ message: 'Acesso registrado com sucesso' });
  } catch (error) {
    console.error('Erro ao registrar acesso:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;
