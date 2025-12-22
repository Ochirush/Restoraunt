// server/routes/inventory.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/auth');

// Все запросы к запасам требуют аутентификацию
router.use(authMiddleware.authenticate);

// Все ингредиенты
router.get(
    '/',
    authMiddleware.checkRole('manager', 'chef', 'head_chef', 'admin'),
    inventoryController.getAllIngredients
);

// Мало на складе
router.get(
    '/low-stock',
    authMiddleware.checkRole('manager', 'chef', 'admin'),
    inventoryController.getLowStockIngredients
);

// Скоро истекает срок годности
router.get(
    '/expiring-soon',
    authMiddleware.checkRole('manager', 'chef', 'admin'),
    inventoryController.getExpiringSoon
);

// Поставщики
router.get(
    '/suppliers',
    authMiddleware.checkRole('manager', 'admin'),
    inventoryController.getSuppliers
);

// Один ингредиент
router.get(
    '/:id',
    authMiddleware.checkRole('manager', 'chef', 'head_chef', 'admin'),
    inventoryController.getIngredientById
);

// Добавить ингредиент
router.post(
    '/',
    authMiddleware.checkRole('manager', 'admin'),
    inventoryController.addIngredient
);

// Обновить ингредиент
router.put(
    '/:id',
    authMiddleware.checkRole('manager', 'admin'),
    inventoryController.updateIngredient
);

// Удалить ингредиент
router.delete(
    '/:id',
    authMiddleware.checkRole('manager', 'admin'),
    inventoryController.deleteIngredient
);

module.exports = router;
