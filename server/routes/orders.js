import express from 'express';
import { getDatabase } from '../config/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// Create order (buyer)
router.post('/', requireAuth, (req, res, next) => {
  try {
    const { items, note } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    let total = 0;
    const orderItems = [];

    // Validate and calculate total
    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }

      if (product.quantity < item.qty) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      // Server-side price validation
      const itemTotal = product.price * item.qty;
      total += itemTotal;
      orderItems.push({
        productId: product.id,
        farmerId: product.farmer_id,
        price: product.price,
        qty: item.qty
      });
    }

    // Begin transaction
    const insertOrder = db.prepare(`
      INSERT INTO orders (user_id, total, status, note)
      VALUES (?, ?, 'pending', ?)
    `);

    const result = insertOrder.run(req.session.user.id, total, note || '');
    const orderId = result.lastInsertRowid;

    // Insert order items and update stock
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, farmer_id, price, qty)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of orderItems) {
      insertItem.run(orderId, item.productId, item.farmerId, item.price, item.qty);

      // Update product quantity
      db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?').run(item.qty, item.productId);
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// Get orders (role-based)
router.get('/', requireAuth, (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const role = req.session.user.role;

    let sql, params;

    if (role === 'buyer') {
      sql = 'SELECT o.* FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC';
      params = [userId];
    } else if (role === 'farmer') {
      sql = `
        SELECT DISTINCT o.* FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.farmer_id = ?
        ORDER BY o.created_at DESC
      `;
      params = [userId];
    } else if (role === 'admin') {
      sql = 'SELECT * FROM orders ORDER BY created_at DESC';
      params = [];
    }

    const stmt = db.prepare(sql);
    const orders = stmt.all(...params);
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Get order details
router.get('/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    res.json({ ...order, items });
  } catch (err) {
    next(err);
  }
});

// Update order status
router.post('/:id/status', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Authorization: only buyer, farmer with items in order, or admin
    if (order.user_id !== req.session.user.id && req.session.user.role !== 'admin') {
      if (req.session.user.role === 'farmer') {
        const farmerItem = db.prepare(
          'SELECT * FROM order_items WHERE order_id = ? AND farmer_id = ?'
        ).get(id, req.session.user.id);
        if (!farmerItem) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
