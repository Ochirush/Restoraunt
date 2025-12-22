const jwt = require('jsonwebtoken');

const authMiddleware = {
    authenticate: (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Требуется аутентификация' });
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Неверный токен' });
        }
    },
    
    checkRole: (...roles) => {
        return (req, res, next) => {
            if (!req.user || !roles.includes(req.user.role)) {
                return res.status(403).json({ 
                    error: 'Недостаточно прав' 
                });
            }
            next();
        };
    }
};

module.exports = authMiddleware;