const pool = require('../config/database');

const inventoryController = {
    async getAllIngredients(req, res) {
        try {
            const { establishment_id } = req.query;
            let query = `
                SELECT i.*, 
                       s.supplier_name,
                       es.name as establishment_name,
                       CASE 
                         WHEN i.expiration_date < CURRENT_DATE THEN 'Просрочен'
                         WHEN i.expiration_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'Скоро истекает'
                         ELSE 'Норма'
                       END as expiration_status,
                       i.expiration_date - CURRENT_DATE as days_until_expiry
                FROM ingredients i
                JOIN suppliers s ON i.supplier_id = s.supplier_id
                JOIN establishments es ON i.establishment_id = es.establishment_id
                WHERE 1=1
            `;
            
            const params = [];
            if (establishment_id) {
                query += ` AND i.establishment_id = $1`;
                params.push(establishment_id);
            }
            
            query += ' ORDER BY i.expiration_date ASC';
            
            const ingredients = await pool.query(query, params);
            res.json(ingredients.rows);
        } catch (error) {
            console.error('Ошибка получения ингредиентов:', error);
            res.status(500).json({ error: 'Ошибка получения ингредиентов' });
        }
    },
    
    async getLowStockIngredients(req, res) {
        try {
            const lowStock = await pool.query(
                `SELECT i.*, 
                        s.supplier_name,
                        es.name as establishment_name,
                        (SELECT SUM(required_quantity) 
                         FROM dish_ingredients di 
                         WHERE di.ingredient_id = i.ingredient_id) as total_required
                 FROM ingredients i
                 JOIN suppliers s ON i.supplier_id = s.supplier_id
                 JOIN establishments es ON i.establishment_id = es.establishment_id
                 WHERE i.quantity < 10
                 ORDER BY i.quantity ASC`
            );
            
            res.json(lowStock.rows);
        } catch (error) {
            console.error('Ошибка получения ингредиентов:', error);
            res.status(500).json({ error: 'Ошибка получения ингредиентов' });
        }
    },
    
    async getExpiringSoon(req, res) {
        try {
            const expiringSoon = await pool.query(
                `SELECT i.*, 
                        s.supplier_name,
                        es.name as establishment_name,
                        i.expiration_date - CURRENT_DATE as days_until_expiry
                 FROM ingredients i
                 JOIN suppliers s ON i.supplier_id = s.supplier_id
                 JOIN establishments es ON i.establishment_id = es.establishment_id
                 WHERE i.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                 ORDER BY i.expiration_date ASC`
            );
            
            res.json(expiringSoon.rows);
        } catch (error) {
            console.error('Ошибка получения ингредиентов:', error);
            res.status(500).json({ error: 'Ошибка получения ингредиентов' });
        }
    },
    
    async getIngredientById(req, res) {
        try {
            const { id } = req.params;
            
            const ingredient = await pool.query(
                `SELECT i.*, s.supplier_name, es.name as establishment_name
                 FROM ingredients i
                 JOIN suppliers s ON i.supplier_id = s.supplier_id
                 JOIN establishments es ON i.establishment_id = es.establishment_id
                 WHERE i.ingredient_id = $1`,
                [id]
            );
            
            if (ingredient.rows.length === 0) {
                return res.status(404).json({ error: 'Ингредиент не найден' });
            }
            
            res.json(ingredient.rows[0]);
        } catch (error) {
            console.error('Ошибка получения ингредиента:', error);
            res.status(500).json({ error: 'Ошибка получения ингредиента' });
        }
    },
    
    async addIngredient(req, res) {
        try {
            const {
                ingredient_name,
                quantity,
                unit,
                date_of_delivery,
                expiration_date,
                supplier_id,
                establishment_id
            } = req.body;
            
            const result = await pool.query(
                `INSERT INTO ingredients 
                 (ingredient_name, quantity, unit, date_of_delivery, expiration_date, supplier_id, establishment_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 RETURNING *`,
                [ingredient_name, quantity, unit, date_of_delivery, expiration_date, supplier_id, establishment_id]
            );
            
            res.status(201).json({ 
                message: 'Ингредиент успешно добавлен', 
                ingredient: result.rows[0] 
            });
        } catch (error) {
            console.error('Ошибка добавления ингредиента:', error);
            res.status(500).json({ error: 'Ошибка добавления ингредиента' });
        }
    },
    
    async updateIngredient(req, res) {
        try {
            const { id } = req.params;
            const { quantity, expiration_date, ingredient_name } = req.body;
            
            const result = await pool.query(
                `UPDATE ingredients 
                 SET quantity = COALESCE($1, quantity),
                     expiration_date = COALESCE($2, expiration_date),
                     ingredient_name = COALESCE($3, ingredient_name)
                 WHERE ingredient_id = $4 
                 RETURNING *`,
                [quantity, expiration_date, ingredient_name, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Ингредиент не найден' });
            }
            
            res.json({ 
                message: 'Ингредиент успешно обновлен', 
                ingredient: result.rows[0] 
            });
        } catch (error) {
            console.error('Ошибка обновления ингредиента:', error);
            res.status(500).json({ error: 'Ошибка обновления ингредиента' });
        }
    },
    
    async deleteIngredient(req, res) {
        try {
            const { id } = req.params;
            
            await pool.query('DELETE FROM ingredients WHERE ingredient_id = $1', [id]);
            
            res.json({ message: 'Ингредиент успешно удален' });
        } catch (error) {
            console.error('Ошибка удаления ингредиента:', error);
            res.status(500).json({ error: 'Ошибка удаления ингредиента' });
        }
    },
    
    async getSuppliers(req, res) {
        try {
            const suppliers = await pool.query('SELECT * FROM suppliers ORDER BY supplier_name');
            res.json(suppliers.rows);
        } catch (error) {
            console.error('Ошибка получения поставщиков:', error);
            res.status(500).json({ error: 'Ошибка получения поставщиков' });
        }
    }
};

module.exports = inventoryController;