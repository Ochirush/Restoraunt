const express = require('express');
const router = express.Router();

// Демо данные меню
const demoDishes = [
    {
        dish_id: 1,
        dish_name: 'Стейк Рибай',
        category: 'Вторые блюда',
        price: 1200,
        cooking_time: '00:30:00',
        availability: true
    },
    {
        dish_id: 2,
        dish_name: 'Салат Цезарь',
        category: 'Закуски',
        price: 450,
        cooking_time: '00:10:00',
        availability: true
    },
    {
        dish_id: 3,
        dish_name: 'Тирамису',
        category: 'Десерты',
        price: 350,
        cooking_time: '00:15:00',
        availability: true
    },
    {
        dish_id: 4,
        dish_name: 'Кола',
        category: 'Напитки',
        price: 150,
        cooking_time: '00:01:00',
        availability: true
    },
    {
        dish_id: 5,
        dish_name: 'Шашлык из свинины',
        category: 'На мангале',
        price: 800,
        cooking_time: '00:25:00',
        availability: false
    }
];

router.get('/', (req, res) => {
    const { category, min_price, max_price, available } = req.query;
    let filteredDishes = demoDishes;
    
    if (category) {
        filteredDishes = filteredDishes.filter(dish => dish.category === category);
    }
    
    if (min_price) {
        filteredDishes = filteredDishes.filter(dish => dish.price >= parseInt(min_price));
    }
    
    if (max_price) {
        filteredDishes = filteredDishes.filter(dish => dish.price <= parseInt(max_price));
    }
    
    if (available === 'true') {
        filteredDishes = filteredDishes.filter(dish => dish.availability === true);
    }
    
    res.json(filteredDishes);
});

router.get('/categories', (req, res) => {
    const categories = [
        'Закуски',
        'Супы',
        'Вторые блюда',
        'На мангале',
        'Десерты',
        'Напитки'
    ];
    
    res.json(categories);
});

module.exports = router;