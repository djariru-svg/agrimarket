import express from 'express';
import { getDatabase } from '../config/database.js';
import { requireAuth, requireFarmer, requireRole } from '../middleware/auth.js';
import { upload, resizeAndSaveImage, deleteImage } from '../middleware/upload.js';
import { validatePrice } from '../utils/validate.js';

const router = express.Router();
const db = getDatabase();

// Get all products
router.get('/', (req, res, next) => {
  try {
    const { category, search } = req.query;
    let sql = 'SELECT p.*, u.name as farmer_name FROM products p JOIN users u ON p.farmer_id = u.id WHERE p.status = "active"';
    const params = [];

    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY p.created_at DESC';
    const stmt = db.prepare(sql);
    const products = stmt.all(...params);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// Get single product
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('SELECT p.*, u.name as farmer_name, u.phone as farmer_phone FROM products p JOIN users u ON p.farmer_id = u.id WHERE p.id = ?');
    const product = stmt.get(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

// Create product (farmer)
router.post('/', requireAuth, requireFarmer, async (req, res, next) => {
  try {
    const { name, category, price, unit, quantity, location, description, icon } = req.body;

    if (!name || !category || !price || !unit || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validatePrice(price)) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    if (quantity < 0) {
      return res.status(400).json({ error: 'Quantity cannot be negative' });
    }

    const stmt = db.prepare(`
      INSERT INTO products (name, category, price, unit, quantity, farmer_id, location, description, icon, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const result = stmt.run(
      name,
      category,
      Math.round(price),
      unit,
      quantity || 0,
      req.session.user.id,
      location,
      description || '',
      icon || '🌾'
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// Update product
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, price, unit, quantity, location, description, icon, status } = req.body;

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.farmer_id !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (price && !validatePrice(price)) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, price = ?, unit = ?, quantity = ?, location = ?, description = ?, icon = ?, status = ?
      WHERE id = ?
    `);

    stmt.run(
      name || product.name,
      category || product.category,
      price ? Math.round(price) : product.price,
      unit || product.unit,
      quantity !== undefined ? quantity : product.quantity,
      location || product.location,
      description !== undefined ? description : product.description,
      icon || product.icon,
      status || product.status,
      id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete product
router.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.farmer_id !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (product.image) {
      deleteImage(product.image);
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

// Get farmer products
router.get('/farmer/:farmerId', (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const stmt = db.prepare('SELECT * FROM products WHERE farmer_id = ? ORDER BY created_at DESC');
    const products = stmt.all(farmerId);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

export default router;
