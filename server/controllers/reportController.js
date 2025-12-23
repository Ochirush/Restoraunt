// server/controllers/reportController.js
const pool = require('../config/database');

const reportController = {
    // Отчет по продажам (графики)
    async getSalesReport(req, res) {
        try {
            const { start_date, end_date, establishment_id } = req.query;

            const salesReport = await pool.query(
                `
                SELECT 
                    DATE(o.datetime) AS date,
                    COUNT(*) AS total_orders,
                    SUM(
                        COALESCE(
                            b.total_price,
                            (
                                SELECT SUM(d.price * p.quantity)
                                FROM positions p
                                JOIN dishes d ON p.dish_id = d.dish_id
                                WHERE p.order_id = o.order_id
                            )
                        )
                    ) AS total_revenue,
                    AVG(
                        COALESCE(
                            b.total_price,
                            (
                                SELECT SUM(d.price * p.quantity)
                                FROM positions p
                                JOIN dishes d ON p.dish_id = d.dish_id
                                WHERE p.order_id = o.order_id
                            )
                        )
                    ) AS avg_order_value,
                    SUM(COALESCE(b.tips, 0)) AS total_tips,
                    AVG(b.rating) AS avg_rating
                FROM orders o
                LEFT JOIN bills b ON o.order_id = b.order_id
                WHERE DATE(o.datetime) BETWEEN COALESCE($1::date, CURRENT_DATE - INTERVAL '30 days')
                                          AND COALESCE($2::date, CURRENT_DATE)
                  AND ($3::int IS NULL OR o.establishment_id = $3::int)
                GROUP BY DATE(o.datetime)
                ORDER BY date DESC
                `,
                [start_date || null, end_date || null, establishment_id || null]
            );

            res.json(salesReport.rows);
        } catch (error) {
            console.error('Ошибка получения отчета по продажам:', error);
            res.status(500).json({ error: 'Ошибка получения отчета' });
        }
    },

    // Отчет по складу
    async getInventoryReport(req, res) {
        try {
            const inventoryReport = await pool.query(
                `
                SELECT 
                    es.name AS establishment,
                    COUNT(i.ingredient_id) AS total_ingredients,
                    SUM(i.quantity) AS total_quantity,
                    COUNT(CASE WHEN i.expiration_date < CURRENT_DATE THEN 1 END) AS expired_count,
                    COUNT(
                        CASE 
                            WHEN i.expiration_date BETWEEN CURRENT_DATE 
                                                    AND CURRENT_DATE + INTERVAL '7 days'
                            THEN 1 
                        END
                    ) AS expiring_soon_count,
                    SUM(
                        CASE 
                            WHEN i.expiration_date < CURRENT_DATE 
                            THEN i.quantity * 100 
                            ELSE 0 
                        END
                    ) AS expired_cost,
                    SUM(
                        CASE 
                            WHEN i.expiration_date BETWEEN CURRENT_DATE 
                                                    AND CURRENT_DATE + INTERVAL '7 days'
                            THEN i.quantity * 50 
                            ELSE 0 
                        END
                    ) AS expiring_soon_cost
                FROM ingredients i
                JOIN establishments es ON i.establishment_id = es.establishment_id
                GROUP BY es.name, es.establishment_id
                ORDER BY es.name
                `
            );

            res.json(inventoryReport.rows);
        } catch (error) {
            console.error('Ошибка получения отчета по складу:', error);
            res.status(500).json({ error: 'Ошибка получения отчета' });
        }
    },

    // Производительность сотрудников
    async getEmployeePerformance(req, res) {
        try {
            const performance = await pool.query(
                `
                SELECT * 
                FROM employee_performance 
                ORDER BY total_revenue DESC NULLS LAST
                `
            );

            res.json(performance.rows);
        } catch (error) {
            console.error('Ошибка получения отчета по сотрудникам:', error);
            res.status(500).json({ error: 'Ошибка получения отчета' });
        }
    },

    // Топ-10 популярных блюд
    async getPopularDishes(req, res) {
        try {
            const { start_date, end_date } = req.query;

            const popularDishes = await pool.query(
                `
                SELECT 
                    d.dish_name,
                    d.category,
                    d.price,
                    COUNT(p.position_id) AS times_ordered,
                    SUM(p.quantity) AS total_quantity,
                    SUM(p.quantity * d.price) AS total_revenue
                FROM dishes d
                JOIN positions p ON d.dish_id = p.dish_id
                JOIN orders o ON p.order_id = o.order_id
                WHERE ($1::timestamp IS NULL OR o.datetime >= $1::timestamp)
                  AND ($2::timestamp IS NULL OR o.datetime <= $2::timestamp)
                GROUP BY d.dish_id, d.dish_name, d.category, d.price
                ORDER BY total_quantity DESC
                LIMIT 10
                `,
                [start_date || null, end_date || null]
            );

            res.json(popularDishes.rows);
        } catch (error) {
            console.error('Ошибка получения отчета по блюдам:', error);
            res.status(500).json({ error: 'Ошибка получения отчета' });
        }
    },

    // Короткая статистика для дашборда
    async getDailyStats(req, res) {
        try {
            const stats = await pool.query(`
                SELECT 
                    -- Кол-во заказов за сегодня
                    (SELECT COUNT(*) 
                     FROM orders 
                     WHERE DATE(datetime) = CURRENT_DATE) AS today_orders,

                    -- Выручка за сегодня
                    (
                        SELECT SUM(
                            COALESCE(
                                b.total_price,
                                (
                                    SELECT SUM(d.price * p.quantity)
                                    FROM positions p
                                    JOIN dishes d ON p.dish_id = d.dish_id
                                    WHERE p.order_id = o.order_id
                                )
                            )
                        )
                        FROM orders o
                        LEFT JOIN bills b ON o.order_id = b.order_id
                        WHERE DATE(o.datetime) = CURRENT_DATE
                    ) AS today_revenue,

                    -- Ингредиенты, истекающие сегодня
                    (SELECT COUNT(*) 
                     FROM ingredients 
                     WHERE expiration_date = CURRENT_DATE) AS expiring_today,

                    -- Активные заказы (Создан или В процессе за сегодня)
                    (SELECT COUNT(*) 
                     FROM orders 
                     WHERE DATE(datetime) = CURRENT_DATE
                       AND status IN ('Создан', 'В процессе')
                    ) AS active_orders
            `);

            const row = stats.rows[0] || {};

            const todayOrders   = Number(row.today_orders)   || 0;
            const todayRevenue  = Number(row.today_revenue)  || 0;
            const expiringToday = Number(row.expiring_today) || 0;
            const activeOrders  = Number(row.active_orders)  || 0;

            // Отдаем и snake_case, и camelCase на всякий случай
            res.json({
                today_orders: todayOrders,
                today_revenue: todayRevenue,
                expiring_today: expiringToday,
                active_orders: activeOrders,
                todayOrders,
                todayRevenue,
                expiringToday,
                activeOrders
            });
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            res.status(500).json({ error: 'Ошибка получения статистики' });
        }
    }
};

module.exports = reportController;
