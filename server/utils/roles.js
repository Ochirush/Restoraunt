function normalizeRole(rawRole) {
    if (!rawRole) return 'employee';

    const r = rawRole.toLowerCase();

    
    if (r.includes('админ'))       return 'admin';
    if (r.includes('аналит'))      return 'analyst';
    if (r.includes('менедж'))      return 'manager';
    if (r.includes('официант'))    return 'waiter';
    if (r.includes('шеф') || r.includes('повар')) return 'chef';
    if (r.includes('бариста'))     return 'barista';

    
    return 'employee';
}

module.exports = { normalizeRole };