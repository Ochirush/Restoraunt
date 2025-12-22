const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware.authenticate);

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.put('/:orderId/positions/:positionId', orderController.updatePositionStatus);
router.delete('/:id', authMiddleware.checkRole('manager'), orderController.deleteOrder);

module.exports = router;