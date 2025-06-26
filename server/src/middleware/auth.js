const jwt = require('jsonwebtoken');

// Middleware para verificar o token JWT
const authenticateToken = (req, res, next) => {
  // Obter o header de autorização
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação não fornecido' });
  }
  
  // Verificar o token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido ou expirado' });
    }
    
    // Adicionar o usuário decodificado à requisição
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
