require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const truckRoutes = require('./routes/trucks');
const contactRoutes = require('./routes/contacts');
const webhookRoutes = require('./routes/webhooks');
const inspectionAlertRoutes = require('./routes/inspection-alerts');
const configurationRoutes = require('./routes/configurations');
const sophiaRoutes = require('./routes/sophia');
const orderRoutes = require('./routes/orders');
const postosRoutes = require('./routes/postos');
const combustiveisRoutes = require('./routes/combustiveis');
const fornecedoresRoutes = require('./routes/fornecedores');
const gasmobileRoutes = require('./routes/gasmobile');
const { startGasMobileAutoSync, stopGasMobileAutoSync } = require('./services/gasmobile-auto-sync');
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
app.use('/api/sophia', sophiaRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/postos', postosRoutes);
app.use('/api/combustiveis', combustiveisRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/gasmobile', gasmobileRoutes);

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
    startGasMobileAutoSync();

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
    stopGasMobileAutoSync();
    await db.disconnect();
    console.log('Conexão com banco de dados fechada.');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao encerrar conexões:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM. Encerrando servidor...');
  try {
    stopGasMobileAutoSync();
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
