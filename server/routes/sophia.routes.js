/**
 * Rotas para a integração com a IA Sophia
 */
const express = require('express');
const router = express.Router();
const sophiaController = require('../controllers/sophia.controller');
const authMiddleware = require('../middleware/auth');

// Todas as rotas da Sophia requerem autenticação
router.use(authMiddleware);

// Envia pedidos selecionados para a IA Sophia
router.post('/orders/send', sophiaController.sendOrdersToSophia);

// Processa todos os pedidos pendentes e envia para a IA Sophia
router.post('/orders/process-pending/:webhookId', sophiaController.processPendingOrdersForSophia);

// Obtém um exemplo do formato do payload da Sophia
router.get('/payload-example', sophiaController.getSophiaPayloadExample);

module.exports = router;
