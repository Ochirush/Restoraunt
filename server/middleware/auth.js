const jwt = require('jsonwebtoken');
const { normalizeRole } = require('../utils/roles');
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

const authMiddleware = {
    authenticate: (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Требуется аутентификация' });
        }
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Неверный токен' });
        }
    },
    
    checkRole: (...allowedRoles) => (req, res, next) => {
        console.log('checkRole: user =', req.user); // тут увидишь role
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        next();
    }

};

module.exports = authMiddleware;
