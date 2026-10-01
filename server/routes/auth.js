import express from 'express';
import bcryptjs from 'bcryptjs';
import { getDatabase } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validateEmail, validatePhone } from '../utils/validate.js';

const router = express.Router();
const db = getDatabase();

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, district, role, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !phone || !district || !role || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!['admin', 'farmer', 'buyer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Insert user
    const stmt = db.prepare(`
      INSERT INTO users (name, email, phone, district, role, password, language, theme, color_theme)
      VALUES (?, ?, ?, ?, ?, ?, 'rw', 'light', 'green')
    `);
    const result = stmt.run(name, email, phone, district, role, hashedPassword);

    // Set session
    const user = {
      id: result.lastInsertRowid,
      name,
      email,
      role,
      avatar: null
    };
    req.session.user = user;

    res.status(201).json({ message: 'Registration successful', user });
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended' });
    }

    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    };

    res.json({ 
      message: 'Login successful', 
      user: req.session.user 
    });
  } catch (err) {
    next(err);
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  const stmt = db.prepare('SELECT id, name, email, phone, district, role, avatar, language, theme, color_theme FROM users WHERE id = ?');
  const user = stmt.get(req.session.user.id);
  res.json(user || {});
});

export default router;
