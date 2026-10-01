import express from 'express';
import bcryptjs from 'bcryptjs';
import { getDatabase } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// Get profile
router.get('/', requireAuth, (req, res, next) => {
  try {
    const stmt = db.prepare('SELECT id, name, email, phone, district, role, avatar, language, theme, color_theme FROM users WHERE id = ?');
    const user = stmt.get(req.session.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Update profile
router.put('/', requireAuth, (req, res, next) => {
  try {
    const { name, phone, district, language, theme, color_theme } = req.body;
    const userId = req.session.user.id;

    const stmt = db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name), 
          phone = COALESCE(?, phone), 
          district = COALESCE(?, district),
          language = COALESCE(?, language),
          theme = COALESCE(?, theme),
          color_theme = COALESCE(?, color_theme)
      WHERE id = ?
    `);

    stmt.run(name || null, phone || null, district || null, language || null, theme || null, color_theme || null, userId);

    // Update session
    if (name) req.session.user.name = name;

    const updated = db.prepare('SELECT id, name, email, phone, district, role, avatar, language, theme, color_theme FROM users WHERE id = ?').get(userId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Change password
router.post('/password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    const passwordMatch = await bcryptjs.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.session.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

// Get user orders
router.get('/orders', requireAuth, (req, res, next) => {
  try {
    const stmt = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
    const orders = stmt.all(req.session.user.id);
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Cancel order
router.post('/orders/:id/cancel', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, req.session.user.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot cancel this order' });
    }

    // Restore product quantities
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    for (const item of items) {
      db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?').run(item.qty, item.product_id);
    }

    db.prepare('UPDATE orders SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
