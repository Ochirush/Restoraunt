const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware.authenticate);

router.get(
    '/sales',
    authMiddleware.checkRole('manager', 'analyst', 'admin'),
    reportController.getSalesReport
);
router.get(
    '/inventory',
    authMiddleware.checkRole('manager', 'analyst', 'admin'),
    reportController.getInventoryReport
);
router.get(
    '/employee-performance',
    authMiddleware.checkRole('manager', 'analyst', 'admin'),
    reportController.getEmployeePerformance
);
router.get(
    '/popular-dishes',
    authMiddleware.checkRole('manager', 'analyst', 'admin'),
    reportController.getPopularDishes
);
router.get('/daily-stats', reportController.getDailyStats);

module.exports = router;
