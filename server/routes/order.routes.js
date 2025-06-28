/**
 * Rotas da API de pedidos
 * Implementa todas as rotas necessárias para CRUD e operações específicas
 */
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticateToken } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas para gerenciamento de pedidos
router.get('/', orderController.getOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/station/:stationId', orderController.getOrdersByStation);
router.get('/:id', orderController.getOrderById);

router.post('/', orderController.createOrder);
router.post('/bulk', orderController.createBulkOrders);
router.post('/:orderId/webhook/:webhookId', orderController.linkOrderToWebhook);
router.post('/:id/notify', orderController.sendOrderNotification);

router.put('/:id', orderController.updateOrder);
router.patch('/:id/status', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
