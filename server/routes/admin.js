import express from 'express';
import { getDatabase } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// Get admin overview
router.get('/overview', requireRole('admin'), (req, res, next) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalFarmers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "farmer"').get().count;
    const totalBuyers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "buyer"').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE status = "active"').get().count;
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const totalRevenue = db.prepare('SELECT SUM(total) as sum FROM orders WHERE status = "delivered"').get().sum || 0;

    res.json({
      totalUsers,
      totalFarmers,
      totalBuyers,
      totalProducts,
      totalOrders,
      totalRevenue
    });
  } catch (err) {
    next(err);
  }
});

// Get all users
router.get('/users', requireRole('admin'), (req, res, next) => {
  try {
    const stmt = db.prepare('SELECT id, name, email, phone, district, role, status, created_at FROM users ORDER BY created_at DESC');
    const users = stmt.all();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Update user status
router.post('/users/:id/status', requireRole('admin'), (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
    const updated = db.prepare('SELECT id, name, email, phone, district, role, status, created_at FROM users WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete user
router.delete('/users/:id', requireRole('admin'), (req, res, next) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

// Get all products
router.get('/products', requireRole('admin'), (req, res, next) => {
  try {
    const stmt = db.prepare('SELECT p.*, u.name as farmer_name FROM products p JOIN users u ON p.farmer_id = u.id ORDER BY p.created_at DESC');
    const products = stmt.all();
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// Update product status
router.post('/products/:id/status', requireRole('admin'), (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'sold_out', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, id);
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Get all orders
router.get('/orders', requireRole('admin'), (req, res, next) => {
  try {
    const stmt = db.prepare('SELECT o.*, u.name as buyer_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC');
    const orders = stmt.all();
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Get analytics
router.get('/analytics', requireRole('admin'), (req, res, next) => {
  try {
    const dailyOrders = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total) as revenue
      FROM orders
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();

    const topProducts = db.prepare(`
      SELECT p.id, p.name, COUNT(oi.id) as times_ordered, SUM(oi.qty) as total_qty
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY times_ordered DESC
      LIMIT 10
    `).all();

    res.json({ dailyOrders, topProducts });
  } catch (err) {
    next(err);
  }
});

export default router;
