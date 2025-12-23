const pool = require('../config/database');

const orderController = {
    async getAllOrders(req, res) {
        try {
            const { status, start_date, end_date, establishment_id } = req.query;
            let query = `
                SELECT o.*, 
                       e.full_name as employee_name,
                       es.name as establishment_name,
                       COALESCE(
                           b.total_price,
                           (SELECT SUM(d.price * p.quantity)
                            FROM positions p
                            JOIN dishes d ON p.dish_id = d.dish_id
                            WHERE p.order_id = o.order_id)
                       ) as total_price,
                       b.rating
                FROM orders o
                JOIN employees e ON o.employee_id = e.employee_id
                JOIN establishments es ON o.establishment_id = es.establishment_id
                LEFT JOIN bills b ON o.order_id = b.order_id
                WHERE 1=1
            `;
            
            const params = [];
            let paramIndex = 1;
            
            if (status) {
                query += ` AND o.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }
            
            if (start_date && end_date) {
                query += ` AND o.datetime BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
                params.push(start_date, end_date);
                paramIndex += 2;
            }
            
            if (establishment_id) {
                query += ` AND o.establishment_id = $${paramIndex}`;
                params.push(establishment_id);
                paramIndex++;
            }
            
            query += ' ORDER BY o.datetime DESC';
            const result = await pool.query(query, params);

            // просто отдать строки как есть – фронт уже под них написан
            res.json(result.rows);
        } catch (error) {
            console.error('Ошибка получения заказов:', error);
            res.status(500).json({ error: 'Ошибка получения заказов' });
        }
    },
    
    async getOrderById(req, res) {
        try {
            const { id } = req.params;
            
            const orderResult = await pool.query(
                `SELECT o.*, 
                        e.full_name as employee_name,
                        es.name as establishment_name,
                        COALESCE(
                            b.total_price,
                            (SELECT SUM(d.price * p.quantity)
                             FROM positions p
                             JOIN dishes d ON p.dish_id = d.dish_id
                             WHERE p.order_id = o.order_id)
                        ) as total_price,
                        b.payment_method,
                        b.tips,
                        b.rating
                 FROM orders o
                 JOIN employees e ON o.employee_id = e.employee_id
                 JOIN establishments es ON o.establishment_id = es.establishment_id
                 LEFT JOIN bills b ON o.order_id = b.order_id
                 WHERE o.order_id = $1`,
                [id]
            );
            
            if (orderResult.rows.length === 0) {
                return res.status(404).json({ error: 'Заказ не найден' });
            }
            
            const order = orderResult.rows[0];
            
            // Получение позиций заказа
            const positionsResult = await pool.query(
                `SELECT p.*, d.dish_name, d.price
                 FROM positions p
                 JOIN dishes d ON p.dish_id = d.dish_id
                 WHERE p.order_id = $1`,
                [id]
            );
            
            order.positions = positionsResult.rows;
            
            res.json(order);
        } catch (error) {
            console.error('Ошибка получения заказа:', error);
            res.status(500).json({ error: 'Ошибка получения заказа' });
        }
    },
    
    async createOrder(req, res) {
        try {
            const { type, table_number, customer_address, establishment_id, positions } = req.body;
            
            // Проверка данных
            if ((type === 'offline' && !table_number) || 
                (type === 'online' && !customer_address)) {
                return res.status(400).json({ error: 'Неверные данные заказа' });
            }
            
            // Создание заказа
            const orderResult = await pool.query(
                `INSERT INTO orders 
                 (type, datetime, status, establishment_id, table_number, customer_address, employee_id)
                 VALUES ($1, NOW(), 'Создан', $2, $3, $4, $5) 
                 RETURNING *`,
                [type, establishment_id, table_number, customer_address, req.user.userId]
            );
            
            const order = orderResult.rows[0];
            
            // Добавление позиций
            if (positions && positions.length > 0) {
                for (const position of positions) {
                    await pool.query(
                        `INSERT INTO positions (order_id, dish_id, quantity, notes)
                         VALUES ($1, $2, $3, $4)`,
                        [order.order_id, position.dish_id, position.quantity, position.notes || '']
                    );
                }
            }
            
            res.status(201).json({ 
                message: 'Заказ успешно создан', 
                order 
            });
        } catch (error) {
            console.error('Ошибка создания заказа:', error);
            res.status(500).json({ error: 'Ошибка создания заказа' });
        }
    },
    
    async updateOrder(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            const result = await pool.query(
                'UPDATE orders SET status = $1 WHERE order_id = $2 RETURNING *',
                [status, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Заказ не найден' });
            }
            
            res.json({ 
                message: 'Заказ успешно обновлен', 
                order: result.rows[0] 
            });
        } catch (error) {
            console.error('Ошибка обновления заказа:', error);
            res.status(500).json({ error: 'Ошибка обновления заказа' });
        }
    },
    
    async updatePositionStatus(req, res) {
        try {
            const { orderId, positionId } = req.params;
            const { is_ready } = req.body;
            
            const result = await pool.query(
                'UPDATE positions SET is_ready = $1 WHERE position_id = $2 AND order_id = $3 RETURNING *',
                [is_ready, positionId, orderId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Позиция не найдена' });
            }
            
            res.json({ 
                message: 'Статус позиции обновлен', 
                position: result.rows[0] 
            });
        } catch (error) {
            console.error('Ошибка обновления статуса:', error);
            res.status(500).json({ error: 'Ошибка обновления статуса' });
        }
    },
    
    async deleteOrder(req, res) {
        try {
            const { id } = req.params;
            
            await pool.query('DELETE FROM orders WHERE order_id = $1', [id]);
            
            res.json({ message: 'Заказ успешно удален' });
        } catch (error) {
            console.error('Ошибка удаления заказа:', error);
            res.status(500).json({ error: 'Ошибка удаления заказа' });
        }
    }
};

module.exports = orderController;
