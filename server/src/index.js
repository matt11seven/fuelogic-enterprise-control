require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const truckRoutes = require('./routes/trucks');
const contactRoutes = require('./routes/contacts');
const webhookRoutes = require('./routes/webhooks');
const inspectionAlertRoutes = require('./routes/inspection-alerts');
const configurationRoutes = require('./routes/configurations');
const db = require('./db');

// Inicialização do app
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/inspection-alerts', inspectionAlertRoutes);
app.use('/api/configurations', configurationRoutes);

// Rota de status para verificar se o servidor está online
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// Inicialização do servidor
async function startServer() {
  try {
    // Tentar conectar ao banco de dados
    await db.connect();
    console.log('Conectado ao PostgreSQL com sucesso!');

    // Iniciar o servidor Express
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Handler para fechamento adequado de conexões
process.on('SIGINT', async () => {
  console.log('Encerrando servidor...');
  try {
    await db.disconnect();
    console.log('Conexão com banco de dados fechada.');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao encerrar conexões:', error);
    process.exit(1);
  }
});

// Iniciar servidor
startServer();
