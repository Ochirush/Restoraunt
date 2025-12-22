const express = require('express');
const router = express.Router();

const menuController = require('../controllers/menucontroller');
// если хочешь проверку токена – раскомментируй:
// const { authenticate } = require('../middleware/auth');

// Список блюд с фильтрами (?category=...&min_price=...&max_price=...&available=true)
router.get(
    '/',
    // authenticate,
    menuController.getAllDishes
);

// Категории блюд (из enum dish_type)
router.get(
    '/categories',
    // authenticate,
    menuController.getCategories
);

// Конкретное блюдо по id
router.get(
    '/:id',
    // authenticate,
    menuController.getDishById
);

// Создание блюда
router.post(
    '/',
    // authenticate,
    menuController.createDish
);

// Обновление блюда
router.put(
    '/:id',
    // authenticate,
    menuController.updateDish
);

// Удаление блюда
router.delete(
    '/:id',
    // authenticate,
    menuController.deleteDish
);

module.exports = router;
