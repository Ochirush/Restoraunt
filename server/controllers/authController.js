const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authController = {
    async register(req, res) {
        try {
            const { email, password, full_name, role } = req.body;
            
            // Проверка существующего пользователя
            const userCheck = await pool.query(
                'SELECT * FROM employees WHERE mail = $1',
                [email]
            );
            
            if (userCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Пользователь уже существует' });
            }
            
            // Хеширование пароля
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Создание пользователя
            const newUser = await pool.query(
                `INSERT INTO employees (full_name, mail, experience, age, information) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [full_name, email, 'Новичок', 25, `Роль: ${role}`]
            );
            
            // В реальном приложении сохранить хешированный пароль в отдельной таблице
            // Для демо просто возвращаем успех
            
            res.status(201).json({ 
                message: 'Пользователь успешно зарегистрирован',
                user: newUser.rows[0]
            });
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            res.status(500).json({ error: 'Ошибка регистрации' });
        }
    },
    
    async login(req, res) {
        try {
            const { email, password } = req.body;
            
            // Поиск пользователя
            const userResult = await pool.query(
                'SELECT * FROM employees WHERE mail = $1',
                [email]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(401).json({ error: 'Пользователь не найден' });
            }
            
            const user = userResult.rows[0];
            
            // В реальном приложении проверять пароль из таблицы аутентификации
            // Для демо используем простую проверку
            const isValidPassword = await bcrypt.compare(password, '$2b$10$DEMOPASSWORDHASH');
            
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Неверный пароль' });
            }
            
            // Определение роли пользователя
            const roleResult = await pool.query(
                `SELECT position FROM est_empl WHERE employee_id = $1`,
                [user.employee_id]
            );
            
            const role = roleResult.rows.length > 0 ? roleResult.rows[0].position : 'employee';
            
            // Создание JWT токена
            const token = jwt.sign(
                { 
                    userId: user.employee_id,
                    email: user.mail,
                    name: user.full_name,
                    role: role
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({
                message: 'Успешный вход',
                token,
                user: {
                    id: user.employee_id,
                    email: user.mail,
                    name: user.full_name,
                    role: role
                }
            });
        } catch (error) {
            console.error('Ошибка входа:', error);
            res.status(500).json({ error: 'Ошибка входа' });
        }
    },
    
    async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            
            const userResult = await pool.query(
                'SELECT * FROM employees WHERE employee_id = $1',
                [userId]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            const user = userResult.rows[0];
            
            res.json({ 
                user: {
                    id: user.employee_id,
                    email: user.mail,
                    name: user.full_name,
                    role: req.user.role
                }
            });
        } catch (error) {
            console.error('Ошибка получения профиля:', error);
            res.status(500).json({ error: 'Ошибка получения профиля' });
        }
    },
    
    async logout(req, res) {
        res.json({ message: 'Успешный выход' });
    }
};

module.exports = authController;