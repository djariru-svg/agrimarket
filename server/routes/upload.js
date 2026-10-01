import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload, resizeAndSaveImage, deleteImage } from '../middleware/upload.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();
const db = getDatabase();

// Upload avatar
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filename = `avatar_${req.session.user.id}_${Date.now()}.png`;
    const filepath = await resizeAndSaveImage(req.file, 'avatars', filename);

    // Get old avatar and delete if exists
    const user = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.session.user.id);
    if (user?.avatar) {
      await deleteImage(user.avatar);
    }

    // Update user avatar
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(filepath, req.session.user.id);
    req.session.user.avatar = filepath;

    res.json({ avatar: filepath });
  } catch (err) {
    next(err);
  }
});

// Delete avatar
router.delete('/avatar', requireAuth, async (req, res, next) => {
  try {
    const user = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.session.user.id);

    if (user?.avatar) {
      await deleteImage(user.avatar);
    }

    db.prepare('UPDATE users SET avatar = NULL WHERE id = ?').run(req.session.user.id);
    req.session.user.avatar = null;

    res.json({ message: 'Avatar deleted' });
  } catch (err) {
    next(err);
  }
});

// Upload product image
router.post('/product/:id', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.farmer_id !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const filename = `product_${id}_${Date.now()}.png`;
    const filepath = await resizeAndSaveImage(req.file, 'products', filename);

    // Delete old image if exists
    if (product.image) {
      await deleteImage(product.image);
    }

    // Update product image
    db.prepare('UPDATE products SET image = ? WHERE id = ?').run(filepath, id);

    res.json({ image: filepath });
  } catch (err) {
    next(err);
  }
});

export default router;
