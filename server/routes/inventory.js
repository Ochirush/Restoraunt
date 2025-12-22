const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware.authenticate);

router.get('/', authMiddleware.checkRole('manager', 'chef', 'head_chef', 'admin'), inventoryController.getAllIngredients);
router.get('/low-stock', authMiddleware.checkRole('manager', 'chef', 'admin'), inventoryController.getLowStockIngredients);
router.get('/expiring-soon', authMiddleware.checkRole('manager', 'chef', 'admin'), inventoryController.getExpiringSoon);
router.get('/suppliers', authMiddleware.checkRole('manager', 'admin'), inventoryController.getSuppliers);
router.get('/:id', inventoryController.getIngredientById);
router.post('/', authMiddleware.checkRole('manager', 'admin'), inventoryController.addIngredient);
router.put('/:id', authMiddleware.checkRole('manager', 'admin'), inventoryController.updateIngredient);
router.delete('/:id', authMiddleware.checkRole('manager', 'admin'), inventoryController.deleteIngredient);

module.exports = router;
