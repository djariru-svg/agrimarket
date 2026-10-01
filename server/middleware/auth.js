import { getDatabase } from '../config/database.js';

export function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Forbidden - insufficient permissions' });
    }
    next();
  };
}

export function requireFarmer(req, res, next) {
  return requireRole('farmer', 'admin')(req, res, next);
}

export function requireBuyer(req, res, next) {
  return requireRole('buyer')(req, res, next);
}

export function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

export function attachUser(req, res, next) {
  if (req.session.user) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(req.session.user.id);
    
    if (user) {
      req.user = user;
    }
  }
  next();
}
