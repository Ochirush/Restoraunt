const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || 'development-secret';
let authTableReady = false;

function normalizeRole(rawRole) {
    const value = (rawRole || '').toLowerCase();

    if (value.includes('админ') || value.includes('admin')) return 'admin';
    if (value.includes('менедж')) return 'manager';
    if (value.includes('аналит')) return 'analyst';
    if (value.includes('шеф')) return 'head_chef';
    if (value.includes('бариста') || value.includes('официант')) return 'waiter';
    if (value.includes('повар')) return 'chef';

    return rawRole || 'employee';
}

async function ensureAuthTables() {
    if (authTableReady) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_accounts (
            account_id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(employee_id) ON DELETE CASCADE,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'employee',
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts(email);
    `);

    authTableReady = true;
}

async function provisionAccountIfMissing(email) {
    // Возвращает существующую или созданную учетную запись для заданного email
    const existing = await pool.query(
        `SELECT ua.account_id, ua.employee_id, ua.password_hash, ua.role as account_role,
                e.full_name, e.mail
         FROM user_accounts ua
         JOIN employees e ON ua.employee_id = e.employee_id
         WHERE ua.email = $1`,
        [email]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    const employeeResult = await pool.query(
        'SELECT employee_id, full_name, mail FROM employees WHERE mail = $1',
        [email]
    );

    if (employeeResult.rows.length === 0) {
        return null;
    }

    const employee = employeeResult.rows[0];
    const roleResult = await pool.query(
        `SELECT position FROM est_empl WHERE employee_id = $1 ORDER BY establishment_id DESC LIMIT 1`,
        [employee.employee_id]
    );
    const rawRole = roleResult.rows[0]?.position || 'employee';
    const normalizedRole = normalizeRole(rawRole);

    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await pool.query(
        `INSERT INTO user_accounts (employee_id, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [employee.employee_id, email, hashedPassword, normalizedRole]
    );

    return {
        account_id: null,
        employee_id: employee.employee_id,
        password_hash: hashedPassword,
        account_role: normalizedRole,
        full_name: employee.full_name,
        mail: employee.mail
    };
}

const authController = {
    async register(req, res) {
        try {
            const { email, password, full_name, role } = req.body;

            if (!email || !password || !full_name || !role) {
                return res.status(400).json({ error: 'Заполните все поля' });
            }

            await ensureAuthTables();

            const existingAccount = await pool.query(
                'SELECT 1 FROM user_accounts WHERE email = $1',
                [email]
            );

            if (existingAccount.rows.length > 0) {
                return res.status(400).json({ error: 'Пользователь уже существует' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const normalizedRole = normalizeRole(role);

            const newUser = await pool.query(
                `INSERT INTO employees (full_name, mail, experience, age, information)
                 VALUES ($1, $2, $3, $4, $5) RETURNING employee_id, full_name, mail`,
                [full_name, email, 'Новичок', 25, `Роль: ${role}`]
            );

            const employee = newUser.rows[0];

            await pool.query(
                `INSERT INTO user_accounts (employee_id, email, password_hash, role)
                 VALUES ($1, $2, $3, $4)`,
                [employee.employee_id, email, hashedPassword, normalizedRole]
            );

            res.status(201).json({
                message: 'Пользователь успешно зарегистрирован',
                user: {
                    id: employee.employee_id,
                    email: employee.mail,
                    name: employee.full_name,
                    role: normalizedRole,
                    role_display: role
                }
            });
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            res.status(500).json({ error: 'Ошибка регистрации' });
        }
    },

    async login(req, res) {
        try {
            const { email, password } = req.body;

            await ensureAuthTables();

            const account = await provisionAccountIfMissing(email);
            if (!account) {
                return res.status(401).json({ error: 'Пользователь не найден' });
            }

            const isValidPassword = await bcrypt.compare(password, account.password_hash);

            if (!isValidPassword) {
                return res.status(401).json({ error: 'Неверный пароль' });
            }

            const roleResult = await pool.query(
                `SELECT position FROM est_empl WHERE employee_id = $1 ORDER BY establishment_id DESC LIMIT 1`,
                [account.employee_id]
            );

            const rawRole = roleResult.rows[0]?.position || account.account_role;
            const normalizedRole = normalizeRole(rawRole);

            const token = jwt.sign(
                {
                    userId: account.employee_id,
                    email: account.mail,
                    name: account.full_name,
                    role: normalizedRole,
                    role_display: rawRole
                },
                DEFAULT_JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Успешный вход',
                token,
                user: {
                    id: account.employee_id,
                    email: account.mail,
                    name: account.full_name,
                    role: normalizedRole,
                    role_display: rawRole
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
