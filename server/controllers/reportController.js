const pool = require('../config/database');

const reportController = {
    async getSalesReport(req, res) {
        try {
            const { start_date, end_date, establishment_id } = req.query;
            
            const salesReport = await pool.query(
                `SELECT DATE(o.datetime) as date,
                        COUNT(*) as total_orders,
                        SUM(b.total_price) as total_revenue,
                        AVG(b.total_price) as avg_order_value,
                        SUM(b.tips) as total_tips,
                        AVG(b.rating) as avg_rating
                 FROM orders o
                 LEFT JOIN bills b ON o.order_id = b.order_id
                 WHERE o.datetime BETWEEN COALESCE($1, CURRENT_DATE - INTERVAL '30 days') 
                       AND COALESCE($2, CURRENT_DATE)
                       AND ($3 IS NULL OR o.establishment_id = $3)
                 GROUP BY DATE(o.datetime)
                 ORDER BY date DESC`,
                [start_date, end_date, establishment_id]
            );
            
            res.json(salesReport.rows);
        } catch (error) {
            console.error('Ошибка получения отчета:', error);
            res.status(500).json({ error: 'Ошибка получения отчета' });
        }
    },
    
    async getInventoryReport(req, res) {
        try {
            const inventoryReport = await pool.query(
                `SELECT es.name as establishment,
                        COUNT(i.ingredient_id) as total_ingredients,
                        SUM(i.quantity) as total_quantity,
                        COUNT(CASE WHEN i.expiration_date < CURRENT_DATE THEN 1 END) as expired_count,
                        COUNT(CASE WHEN i.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as expiring_soon_count,
                        SUM(CASE WHEN i.expiration_date < CURRENT_DATE THEN i.quantity * 100 ELSE 0 END) as expired_cost,
                        SUM(CASE WHEN i.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN i.quantity * 50 ELSE 0 END) as expiring_soon_cost
                 FROM ingredients i
                 JOIN establishments es ON i.establishment_id = es.establishment_id
                 GROUP BY es.name, es.establishment_id
                 ORDER BY es.name`
            );
            
            res.json(inventoryReport.rows);
        } catch (error) {
            console.error('Ошибка получения отчета:', error);
            res.status(500).json({ error: 'Ошибка получения отчета' });
        }
    },
    
    async getEmployeePerformance(req, res) {
        try {
            const performance = await pool.query(
                `SELECT * FROM employee_performance 
                 ORDER BY total_revenue DESC NULLS LAST`
            );
            
            res.json(performance.rows);
        } catch (error) {
            console.error('Ошибка получения отчета:', error);
            res.status(500).json({ error: 'Ошибка получения отчета' });
        }
    },
    
    async getPopularDishes(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            const popularDishes = await pool.query(
                `SELECT d.dish_name, d.category, d.price,
                        COUNT(p.position_id) as times_ordered,
                        SUM(p.quantity) as total_quantity,
                        SUM(p.quantity * d.price) as total_revenue
                 FROM dishes d
                 JOIN positions p ON d.dish_id = p.dish_id
                 JOIN orders o ON p.order_id = o.order_id
                 WHERE ($1 IS NULL OR o.datetime >= $1)
                   AND ($2 IS NULL OR o.datetime <= $2)
                 GROUP BY d.dish_id, d.dish_name, d.category, d.price
                 ORDER BY total_quantity DESC
                 LIMIT 10`,
                [start_date, end_date]
            );
            
            res.json(popularDishes.rows);
        } catch (error) {
            console.error('Ошибка получения отчета:', error);
            res.status(500).json({ error: 'Ошибка получения отчета' });
        }
    },
    
    async getDailyStats(req, res) {
        try {
            const stats = await pool.query(
                `SELECT 
                    (SELECT COUNT(*) FROM orders WHERE DATE(datetime) = CURRENT_DATE) as today_orders,
                    (SELECT SUM(total_price) FROM bills b 
                     JOIN orders o ON b.order_id = o.order_id 
                     WHERE DATE(o.datetime) = CURRENT_DATE) as today_revenue,
                    (SELECT COUNT(*) FROM ingredients 
                     WHERE expiration_date = CURRENT_DATE) as expiring_today,
                    (SELECT COUNT(*) FROM orders 
                     WHERE status = 'В процессе') as active_orders`
            );
            
            res.json(stats.rows[0]);
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            res.status(500).json({ error: 'Ошибка получения статистики' });
        }
    }
};

module.exports = reportController;