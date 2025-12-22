const pool = require('../config/database');

const menuController = {
    async getAllDishes(req, res) {
        try {
            const { category, min_price, max_price, available } = req.query;
            let query = `
                SELECT d.*,
                       CASE 
                         WHEN EXISTS (
                             SELECT 1
                             FROM dish_ingredients di
                             JOIN ingredients i ON di.ingredient_id = i.ingredient_id
                             WHERE di.dish_id = d.dish_id
                               AND (i.expiration_date < CURRENT_DATE OR i.quantity < di.required_quantity)
                         ) THEN false
                         ELSE true
                       END as calculated_availability
                FROM dishes d
                WHERE 1=1
            `;
            
            const params = [];
            let paramIndex = 1;
            
            if (category) {
                query += ` AND d.category = $${paramIndex}`;
                params.push(category);
                paramIndex++;
            }
            
            if (min_price) {
                query += ` AND d.price >= $${paramIndex}`;
                params.push(parseInt(min_price));
                paramIndex++;
            }
            
            if (max_price) {
                query += ` AND d.price <= $${paramIndex}`;
                params.push(parseInt(max_price));
                paramIndex++;
            }
            
            if (available === 'true') {
                query += ` AND d.availability = true`;
            }
            
            query += ' ORDER BY d.dish_name';
            
            const dishes = await pool.query(query, params);
            res.json(dishes.rows);
        } catch (error) {
            console.error('Ошибка получения блюд:', error);
            res.status(500).json({ error: 'Ошибка получения блюд' });
        }
    },
    
    async getDishById(req, res) {
        try {
            const { id } = req.params;
            
            const dish = await pool.query(
                `SELECT d.*,
                        json_agg(
                            json_build_object(
                                'ingredient_id', i.ingredient_id,
                                'ingredient_name', i.ingredient_name,
                                'required_quantity', di.required_quantity,
                                'unit', i.unit
                            )
                        ) as ingredients
                 FROM dishes d
                 LEFT JOIN dish_ingredients di ON d.dish_id = di.dish_id
                 LEFT JOIN ingredients i ON di.ingredient_id = i.ingredient_id
                 WHERE d.dish_id = $1
                 GROUP BY d.dish_id`,
                [id]
            );
            
            if (dish.rows.length === 0) {
                return res.status(404).json({ error: 'Блюдо не найдено' });
            }
            
            res.json(dish.rows[0]);
        } catch (error) {
            console.error('Ошибка получения блюда:', error);
            res.status(500).json({ error: 'Ошибка получения блюда' });
        }
    },
    
    async getCategories(req, res) {
        try {
            const categories = await pool.query(
                "SELECT unnest(enum_range(NULL::dish_type)) as category"
            );
            res.json(categories.rows.map(row => row.category));
        } catch (error) {
            console.error('Ошибка получения категорий:', error);
            res.status(500).json({ error: 'Ошибка получения категорий' });
        }
    },
    
    async createDish(req, res) {
        try {
            const { dish_name, category, price, cooking_time, ingredients } = req.body;
            
            // Создание блюда
            const dishResult = await pool.query(
                `INSERT INTO dishes (dish_name, category, price, cooking_time, availability)
                 VALUES ($1, $2, $3, $4, true)
                 RETURNING *`,
                [dish_name, category, price, cooking_time]
            );
            
            const dish = dishResult.rows[0];
            
            // Добавление ингредиентов
            if (ingredients && ingredients.length > 0) {
                for (const ingredient of ingredients) {
                    await pool.query(
                        `INSERT INTO dish_ingredients (dish_id, ingredient_id, required_quantity)
                         VALUES ($1, $2, $3)`,
                        [dish.dish_id, ingredient.ingredient_id, ingredient.required_quantity]
                    );
                }
            }
            
            res.status(201).json({ 
                message: 'Блюдо успешно создано', 
                dish 
            });
        } catch (error) {
            console.error('Ошибка создания блюда:', error);
            res.status(500).json({ error: 'Ошибка создания блюда' });
        }
    },
    
    async updateDish(req, res) {
        try {
            const { id } = req.params;
            const { dish_name, category, price, cooking_time, availability } = req.body;
            
            const result = await pool.query(
                `UPDATE dishes 
                 SET dish_name = COALESCE($1, dish_name),
                     category = COALESCE($2, category),
                     price = COALESCE($3, price),
                     cooking_time = COALESCE($4, cooking_time),
                     availability = COALESCE($5, availability)
                 WHERE dish_id = $6 
                 RETURNING *`,
                [dish_name, category, price, cooking_time, availability, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Блюдо не найдено' });
            }
            
            res.json({ 
                message: 'Блюдо успешно обновлено', 
                dish: result.rows[0] 
            });
        } catch (error) {
            console.error('Ошибка обновления блюда:', error);
            res.status(500).json({ error: 'Ошибка обновления блюда' });
        }
    },
    
    async deleteDish(req, res) {
        try {
            const { id } = req.params;
            
            await pool.query('DELETE FROM dishes WHERE dish_id = $1', [id]);
            
            res.json({ message: 'Блюдо успешно удалено' });
        } catch (error) {
            console.error('Ошибка удаления блюда:', error);
            res.status(500).json({ error: 'Ошибка удаления блюда' });
        }
    }
};

module.exports = menuController;