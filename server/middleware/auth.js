const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

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

const authMiddleware = {
    authenticate: (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Требуется аутентификация' });
        }
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = {
                ...decoded,
                role_display: decoded.role_display || decoded.role,
                role: normalizeRole(decoded.role)
            };
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Неверный токен' });
        }
    },
    
    checkRole: (...roles) => {
        return (req, res, next) => {
            const normalized = normalizeRole(req.user?.role);
            if (!req.user || !roles.includes(normalized)) {
                return res.status(403).json({ 
                    error: 'Недостаточно прав' 
                });
            }
            next();
        };
    }
};

module.exports = authMiddleware;
