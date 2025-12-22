const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware.authenticate);
router.use(authMiddleware.checkRole('manager', 'analyst'));

router.get('/sales', reportController.getSalesReport);
router.get('/inventory', reportController.getInventoryReport);
router.get('/employee-performance', reportController.getEmployeePerformance);
router.get('/popular-dishes', reportController.getPopularDishes);
router.get('/daily-stats', reportController.getDailyStats);

module.exports = router;