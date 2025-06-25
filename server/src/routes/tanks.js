const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

// Middleware para verificar o token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

/**
 * Rota para buscar dados dos tanques - funciona como um proxy para a API externa
 */
router.get('/data', verifyToken, async (req, res) => {
  try {
    const apiKey = req.query.apiKey;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key não fornecida' });
    }
    
    const tanksEndpoint = process.env.TANKS_ENDPOINT;
    
    if (!tanksEndpoint) {
      return res.status(500).json({ error: 'Endpoint dos tanques não configurado no servidor' });
    }
    
    console.log(`Fazendo requisição para: ${tanksEndpoint}?apiKey=${apiKey.substring(0, 5)}...`);
    
    // Construa a URL com a apiKey
    const url = new URL(tanksEndpoint);
    url.searchParams.append('apiKey', apiKey);
    
    // Faz a requisição para a API externa
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log(`Status da resposta: ${response.status} ${response.statusText}`);
    
    // Se a resposta não for bem-sucedida, retorna o erro
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Erro na requisição: ${response.status} ${response.statusText}` 
      });
    }
    
    // Lê o corpo da resposta como texto primeiro
    const responseText = await response.text();
    
    // Se o texto estiver vazio, retorna erro
    if (!responseText || responseText.trim() === '') {
      return res.status(500).json({ error: 'A API de tanques retornou uma resposta vazia' });
    }
    
    try {
      // Tenta converter para JSON
      const data = JSON.parse(responseText);
      return res.json(data);
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', parseError);
      return res.status(500).json({ 
        error: 'Resposta inválida da API de tanques',
        responseText: responseText.substring(0, 100) + '...' // Mostra parte da resposta para depuração
      });
    }
  } catch (error) {
    console.error('Erro ao buscar dados dos tanques:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
