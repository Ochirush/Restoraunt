const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static(path.join(__dirname, '..')));
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));

// Демо пользователи
const demoUsers = {
    'admin@restaurant.com': { 
        password: 'admin123', 
        role: 'admin', 
        name: 'Администратор',
        id: 1
    },
    'manager@restaurant.com': { 
        password: 'manager123', 
        role: 'manager', 
        name: 'Менеджер',
        id: 2
    },
    'chef@restaurant.com': { 
        password: 'chef123', 
        role: 'chef', 
        name: 'Шеф-повар',
        id: 3
    },
    'waiter@restaurant.com': { 
        password: 'waiter123', 
        role: 'waiter', 
        name: 'Официант',
        id: 4
    },
    'analyst@restaurant.com': { 
        password: 'analyst123', 
        role: 'analyst', 
        name: 'Аналитик',
        id: 5
    }
};

// Простой JWT эмулятор
function generateToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 часа
    };
    // Для демо просто кодируем в base64
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString());
        if (payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return payload;
    } catch (error) {
        return null;
    }
}

// Middleware для проверки аутентификации
function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется аутентификация' });
    }
    
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ error: 'Неверный токен' });
    }
    
    req.user = user;
    next();
}

// Middleware для проверки ролей
function checkRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        next();
    };
}

// Auth routes
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = demoUsers[email];
    
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    const token = generateToken({
        id: user.id,
        email: email,
        name: user.name,
        role: user.role
    });
    
    res.json({
        message: 'Успешный вход',
        token,
        user: {
            email,
            name: user.name,
            role: user.role
        }
    });
});

app.post('/api/auth/register', (req, res) => {
    const { email, password, full_name, role } = req.body;
    
    // Демо регистрация - просто возвращаем успех
    res.json({
        message: 'Регистрация успешна',
        user: {
            email,
            name: full_name,
            role
        }
    });
});

// Демо данные
const demoOrders = [
    { order_id: 1, type: 'offline', datetime: '2024-01-15 12:30:00', status: 'Завершен', total_price: 1250.50, employee_name: 'Иван Иванов', establishment_name: 'Ресторан "Гранд"' },
    { order_id: 2, type: 'online', datetime: '2024-01-15 18:45:00', status: 'В процессе', total_price: 890.00, employee_name: 'Петр Петров', establishment_name: 'Ресторан "Гранд"' },
    { order_id: 3, type: 'offline', datetime: '2024-01-14 20:15:00', status: 'Создан', total_price: 1560.75, employee_name: 'Мария Сидорова', establishment_name: 'Ресторан "Гранд"' }
];

const demoIngredients = [
    { ingredient_id: 1, ingredient_name: 'Говядина', quantity: 25.5, unit: 'кг', expiration_date: '2024-02-01', expiration_status: 'Норма', supplier_name: 'Мясной Двор', establishment_name: 'Ресторан "Гранд"' },
    { ingredient_id: 2, ingredient_name: 'Курица', quantity: 15.0, unit: 'кг', expiration_date: '2024-01-25', expiration_status: 'Скоро истекает', supplier_name: 'Птицефабрика', establishment_name: 'Ресторан "Гранд"' },
    { ingredient_id: 3, ingredient_name: 'Помидоры', quantity: 8.0, unit: 'кг', expiration_date: '2024-01-20', expiration_status: 'Просрочен', supplier_name: 'Овощная База', establishment_name: 'Ресторан "Гранд"' }
];

const demoDishes = [
    { dish_id: 1, dish_name: 'Стейк Рибай', category: 'Вторые блюда', price: 1200, cooking_time: '00:30:00', availability: true },
    { dish_id: 2, dish_name: 'Салат Цезарь', category: 'Закуски', price: 450, cooking_time: '00:10:00', availability: true },
    { dish_id: 3, dish_name: 'Тирамису', category: 'Десерты', price: 350, cooking_time: '00:15:00', availability: true }
];

// Orders API
app.get('/api/orders', authenticate, (req, res) => {
    const { status } = req.query;
    let filteredOrders = demoOrders;
    
    if (status) {
        filteredOrders = demoOrders.filter(order => order.status === status);
    }
    
    // Ограничиваем количество для дашборда
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    if (limit) {
        filteredOrders = filteredOrders.slice(0, limit);
    }
    
    res.json(filteredOrders);
});

app.get('/api/orders/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const order = demoOrders.find(o => o.order_id === parseInt(id));
    
    if (!order) {
        return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    // Добавляем позиции для просмотра
    const orderWithPositions = {
        ...order,
        positions: [
            { position_id: 1, dish_name: 'Стейк Рибай', quantity: 2, price: 1200, is_ready: true },
            { position_id: 2, dish_name: 'Салат Цезарь', quantity: 1, price: 450, is_ready: true }
        ]
    };
    
    res.json(orderWithPositions);
});

app.post('/api/orders', authenticate, (req, res) => {
    const newOrder = {
        order_id: Math.floor(Math.random() * 1000),
        ...req.body,
        datetime: new Date().toISOString(),
        status: 'Создан',
        employee_name: req.user.name,
        establishment_name: 'Ресторан "Гранд"'
    };
    
    res.status(201).json({
        message: 'Заказ успешно создан',
        order: newOrder
    });
});

app.put('/api/orders/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    res.json({
        message: 'Заказ успешно обновлен',
        order: {
            order_id: parseInt(id),
            status: status || 'Обновлен',
            updated_at: new Date().toISOString()
        }
    });
});

app.put('/api/orders/:orderId/positions/:positionId', authenticate, (req, res) => {
    const { orderId, positionId } = req.params;
    const { is_ready } = req.body;
    
    res.json({
        message: 'Статус позиции обновлен',
        position: {
            position_id: parseInt(positionId),
            is_ready: is_ready
        }
    });
});

// Inventory API
app.get('/api/inventory', authenticate, checkRole('manager', 'chef', 'head_chef'), (req, res) => {
    res.json(demoIngredients);
});

app.get('/api/inventory/low-stock', authenticate, checkRole('manager', 'chef'), (req, res) => {
    const lowStock = demoIngredients.filter(ing => ing.quantity < 10);
    res.json(lowStock);
});

app.get('/api/inventory/expiring-soon', authenticate, checkRole('manager', 'chef'), (req, res) => {
    const expiringSoon = demoIngredients.filter(ing => ing.expiration_status === 'Скоро истекает');
    res.json(expiringSoon);
});

app.get('/api/inventory/suppliers', authenticate, checkRole('manager'), (req, res) => {
    const suppliers = [
        { supplier_id: 1, supplier_name: 'Мясной Двор' },
        { supplier_id: 2, supplier_name: 'Птицефабрика' },
        { supplier_id: 3, supplier_name: 'Овощная База' }
    ];
    res.json(suppliers);
});

app.get('/api/inventory/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const ingredient = demoIngredients.find(i => i.ingredient_id === parseInt(id));
    
    if (!ingredient) {
        return res.status(404).json({ error: 'Ингредиент не найден' });
    }
    
    res.json(ingredient);
});

app.post('/api/inventory', authenticate, checkRole('manager'), (req, res) => {
    const newIngredient = {
        ingredient_id: Math.floor(Math.random() * 1000),
        ...req.body
    };
    
    res.status(201).json({
        message: 'Ингредиент успешно добавлен',
        ingredient: newIngredient
    });
});

app.put('/api/inventory/:id', authenticate, checkRole('manager'), (req, res) => {
    const { id } = req.params;
    
    res.json({
        message: 'Ингредиент успешно обновлен',
        ingredient: {
            ingredient_id: parseInt(id),
            ...req.body
        }
    });
});

// Menu API
app.get('/api/menu', authenticate, (req, res) => {
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
    } else if (available === 'false') {
        filteredDishes = filteredDishes.filter(dish => dish.availability === false);
    }
    
    res.json(filteredDishes);
});

app.get('/api/menu/categories', authenticate, (req, res) => {
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

app.get('/api/menu/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const dish = demoDishes.find(d => d.dish_id === parseInt(id));
    
    if (!dish) {
        return res.status(404).json({ error: 'Блюдо не найден' });
    }
    
    // Добавляем ингредиенты для просмотра
    const dishWithIngredients = {
        ...dish,
        ingredients: [
            { ingredient_id: 1, ingredient_name: 'Говядина', required_quantity: 0.3, unit: 'кг' },
            { ingredient_id: 2, ingredient_name: 'Специи', required_quantity: 0.05, unit: 'кг' }
        ]
    };
    
    res.json(dishWithIngredients);
});

app.post('/api/menu', authenticate, checkRole('manager', 'chef', 'head_chef'), (req, res) => {
    const newDish = {
        dish_id: Math.floor(Math.random() * 1000),
        ...req.body
    };
    
    res.status(201).json({
        message: 'Блюдо успешно создано',
        dish: newDish
    });
});

app.put('/api/menu/:id', authenticate, checkRole('manager', 'chef', 'head_chef'), (req, res) => {
    const { id } = req.params;
    
    res.json({
        message: 'Блюдо успешно обновлено',
        dish: {
            dish_id: parseInt(id),
            ...req.body
        }
    });
});

// Reports API
app.get('/api/reports/sales', authenticate, checkRole('manager', 'analyst'), (req, res) => {
    const salesReport = [
        { date: '2024-01-15', total_orders: 8, total_revenue: 12500.50, avg_order_value: 1562.56, total_tips: 500, avg_rating: 4.8 },
        { date: '2024-01-14', total_orders: 12, total_revenue: 18900.75, avg_order_value: 1575.06, total_tips: 750, avg_rating: 4.9 },
        { date: '2024-01-13', total_orders: 10, total_revenue: 15600.25, avg_order_value: 1560.03, total_tips: 400, avg_rating: 4.7 }
    ];
    res.json(salesReport);
});

app.get('/api/reports/inventory', authenticate, checkRole('manager', 'analyst'), (req, res) => {
    const inventoryReport = [
        {
            establishment: 'Ресторан "Гранд"',
            total_ingredients: 45,
            total_quantity: 156.8,
            expired_count: 2,
            expiring_soon_count: 3,
            expired_cost: 200,
            expiring_soon_cost: 150
        }
    ];
    res.json(inventoryReport);
});

app.get('/api/reports/employee-performance', authenticate, checkRole('manager', 'analyst'), (req, res) => {
    const performance = [
        {
            employee_id: 1,
            full_name: 'Иван Иванов',
            total_orders: 45,
            total_time_seconds: 32400,
            total_revenue: 67500.50,
            avg_rating: 4.8
        },
        {
            employee_id: 2,
            full_name: 'Мария Сидорова',
            total_orders: 38,
            total_time_seconds: 28900,
            total_revenue: 58900.75,
            avg_rating: 4.9
        }
    ];
    res.json(performance);
});

app.get('/api/reports/popular-dishes', authenticate, checkRole('manager', 'analyst'), (req, res) => {
    const popularDishes = [
        { dish_id: 1, dish_name: 'Стейк Рибай', category: 'Вторые блюда', price: 1200, times_ordered: 45, total_quantity: 67, total_revenue: 80400 },
        { dish_id: 2, dish_name: 'Салат Цезарь', category: 'Закуски', price: 450, times_ordered: 89, total_quantity: 89, total_revenue: 40050 },
        { dish_id: 3, dish_name: 'Тирамису', category: 'Десерты', price: 350, times_ordered: 56, total_quantity: 56, total_revenue: 19600 }
    ];
    res.json(popularDishes);
});

app.get('/api/reports/daily-stats', authenticate, (req, res) => {
    const stats = {
        today_orders: 8,
        today_revenue: 12500.50,
        expiring_today: 3,
        active_orders: 5
    };
    res.json(stats);
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Откройте http://localhost:${PORT} в браузере`);
    console.log(`📧 Демо аккаунты:`);
    console.log(`   admin@restaurant.com / admin123 (администратор)`);
    console.log(`   manager@restaurant.com / manager123 (менеджер)`);
    console.log(`   chef@restaurant.com / chef123 (повар)`);
    console.log(`   waiter@restaurant.com / waiter123 (официант)`);
    console.log(`   analyst@restaurant.com / analyst123 (аналитик)`);
});