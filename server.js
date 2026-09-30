const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_ROOT = __dirname;
const STATIC_ROOT = path.join(APP_ROOT, 'agrimarket-rw');
const DATA_DIR = path.join(APP_ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'agrimarket.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function respond(res, payload, code = 200) {
  return res.status(code).json(payload);
}

function getInput(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) {
    return req.body;
  }
  return {};
}

function requireAuth(req, res) {
  const user = req.session?.user;
  if (!user) {
    throw { status: 401, payload: { error: 'Unauthorized. Please login.' } };
  }
  return user;
}

function requireRole(req, res, roles) {
  const user = requireAuth(req, res);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    throw { status: 403, payload: { error: 'Forbidden' } };
  }
  return user;
}

function maskName(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length <= 1) return name;
  const lastInitial = parts[parts.length - 1].charAt(0);
  parts.pop();
  return `${parts.join(' ')} ${lastInitial}.`;
}

function monthlyStamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

app.use(
  session({
    secret: 'agrimarket-rw-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost', 'http://localhost:80', 'http://127.0.0.1', 'http://localhost/agrimarket-rw'];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.static(STATIC_ROOT));

async function initializeDatabase() {
  await run('PRAGMA foreign_keys = ON;');

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      district TEXT NOT NULL,
      role TEXT NOT NULL,
      password TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      unit TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      farmer_id TEXT NOT NULL,
      farmer_name TEXT NOT NULL,
      district TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '🌾',
      badge TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_phone TEXT NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      unit TEXT NOT NULL,
      icon TEXT NOT NULL,
      farmer_id TEXT NOT NULL,
      farmer_name TEXT NOT NULL,
      subtotal INTEGER NOT NULL
    );
  `);

  const userCountRow = await get('SELECT COUNT(*) AS count FROM users');
  if (!userCountRow || Number(userCountRow.count) === 0) {
    const sampleUsers = [
      {
        id: 'admin1',
        name: 'Admin',
        email: 'admin@agrimarket.rw',
        phone: '0788000000',
        district: 'Kigali',
        role: 'admin',
        password: await bcrypt.hash('admin123', 10),
      },
      {
        id: 'f1',
        name: 'Uwimana Jean',
        email: 'jean@farm.rw',
        phone: '0788111111',
        district: 'Northern',
        role: 'farmer',
        password: await bcrypt.hash('farmer123', 10),
      },
      {
        id: 'f2',
        name: 'Mukamana Claire',
        email: 'claire@farm.rw',
        phone: '0788222222',
        district: 'Southern',
        role: 'farmer',
        password: await bcrypt.hash('farmer123', 10),
      },
      {
        id: 'f3',
        name: 'Habimana Eric',
        email: 'eric@farm.rw',
        phone: '0788333333',
        district: 'Eastern',
        role: 'farmer',
        password: await bcrypt.hash('farmer123', 10),
      },
      {
        id: 'f4',
        name: 'Niyonsenga Marie',
        email: 'marie@farm.rw',
        phone: '0788444444',
        district: 'Western',
        role: 'farmer',
        password: await bcrypt.hash('farmer123', 10),
      },
      {
        id: 'f5',
        name: 'Bizimana Paul',
        email: 'paul@farm.rw',
        phone: '0788555555',
        district: 'Eastern',
        role: 'farmer',
        password: await bcrypt.hash('farmer123', 10),
      },
      {
        id: 'b1',
        name: 'Mutesi Alice',
        email: 'alice@buyer.rw',
        phone: '0788666666',
        district: 'Kigali',
        role: 'buyer',
        password: await bcrypt.hash('buyer123', 10),
      },
    ];

    for (const user of sampleUsers) {
      await run(
        `INSERT INTO users (id, name, email, phone, district, role, password, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [user.id, user.name, user.email.toLowerCase(), user.phone, user.district, user.role, user.password, monthlyStamp()]
      );
    }
  }

  const productCountRow = await get('SELECT COUNT(*) AS count FROM products');
  if (!productCountRow || Number(productCountRow.count) === 0) {
    const sampleProducts = [
      { id: 'p1', name: 'Ibihaza (Cabbages)', category: 'Imboga', price: 500, unit: 'kg', quantity: 199, farmer_id: 'f1', farmer_name: 'Uwimana Jean', district: 'Northern', location: 'Musanze', description: 'Ibihaza byiza byavuye mu mirima ya Musanze.', icon: '🥬', badge: 'Bishya', status: 'active' },
      { id: 'p2', name: 'Amashaza (Beans)', category: 'Ibinyampeke', price: 1200, unit: 'kg', quantity: 500, farmer_id: 'f2', farmer_name: 'Mukamana Claire', district: 'Southern', location: 'Huye', description: "Amashaza meza y'ubwoko bwa red beans.", icon: '🫘', badge: null, status: 'active' },
      { id: 'p3', name: 'Ibijumba (Sweet Potatoes)', category: 'Imyumbati', price: 400, unit: 'kg', quantity: 300, farmer_id: 'f1', farmer_name: 'Uwimana Jean', district: 'Northern', location: 'Musanze', description: "Ibijumba byiza by'ubwoko bwa orange flesh.", icon: '🍠', badge: 'Popular', status: 'active' },
      { id: 'p4', name: 'Imineke (Bananas)', category: 'Imyaka', price: 800, unit: 'bunch', quantity: 50, farmer_id: 'f3', farmer_name: 'Habimana Eric', district: 'Eastern', location: 'Kayonza', description: "Imineke myiza y'ubwoko bwa apple bananas.", icon: '🍌', badge: null, status: 'active' },
      { id: 'p5', name: "Amata y'inka (Fresh Milk)", category: 'Amata', price: 600, unit: 'liter', quantity: 99, farmer_id: 'f4', farmer_name: 'Niyonsenga Marie', district: 'Western', location: 'Rubavu', description: 'Amata meza y\'inka zitungwa neza.', icon: '🥛', badge: 'Fresh', status: 'active' },
      { id: 'p6', name: 'Tomatisi (Tomatoes)', category: 'Imboga', price: 700, unit: 'kg', quantity: 150, farmer_id: 'f2', farmer_name: 'Mukamana Claire', district: 'Southern', location: 'Huye', description: 'Tomatisi nziza zikomoka ku mirima ya Huye.', icon: '🍅', badge: 'Bishya', status: 'active' },
      { id: 'p7', name: 'Ibigori (Maize)', category: 'Ibinyampeke', price: 450, unit: 'kg', quantity: 1000, farmer_id: 'f5', farmer_name: 'Bizimana Paul', district: 'Eastern', location: 'Nyagatare', description: "Ibigori byiza by'ubwoko bwa hybrid.", icon: '🌽', badge: null, status: 'active' },
      { id: 'p8', name: 'Amacunga (Oranges)', category: 'Imyaka', price: 1500, unit: 'kg', quantity: 80, farmer_id: 'f3', farmer_name: 'Habimana Eric', district: 'Eastern', location: 'Kayonza', description: "Amacunga meza y'ubwoko bwa Valencia.", icon: '🍊', badge: 'Popular', status: 'active' },
    ];

    for (const product of sampleProducts) {
      await run(
        `INSERT INTO products (id, name, category, price, unit, quantity, farmer_id, farmer_name, district, location, description, icon, badge, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [product.id, product.name, product.category, product.price, product.unit, product.quantity, product.farmer_id, product.farmer_name, product.district, product.location, product.description, product.icon, product.badge, product.status, monthlyStamp()]
      );
    }
  }
}

async function toProductRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    unit: row.unit,
    quantity: Number(row.quantity),
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    district: row.district,
    location: row.location,
    description: row.description,
    icon: row.icon,
    badge: row.badge,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function hydrateOrder(order) {
  const items = await all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  return {
    id: order.id,
    userId: order.user_id,
    userName: order.user_name,
    userPhone: order.user_phone,
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.name,
      price: Number(item.price),
      qty: Number(item.qty),
      unit: item.unit,
      icon: item.icon,
      farmerId: item.farmer_id,
      farmerName: item.farmer_name,
      subtotal: Number(item.subtotal),
    })),
    total: Number(order.total),
    status: order.status,
    note: order.note,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

async function authHandlers(req, res) {
  const action = req.query.action || '';
  const input = getInput(req);

  if (action === 'login' && req.method === 'POST') {
    const email = String(input.email || '').trim();
    const password = String(input.password || '');

    if (!email || !password) {
      return respond(res, { error: 'Email na password birakenewe' }, 400);
    }

    const userRow = await get('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    if (!userRow) {
      return respond(res, { error: "Email cyangwa ijambo ry'ibanga ntabwo ari byo" }, 401);
    }

    const valid = await bcrypt.compare(password, userRow.password);
    if (!valid) {
      return respond(res, { error: "Email cyangwa ijambo ry'ibanga ntabwo ari byo" }, 401);
    }

    const user = { ...userRow, password: undefined };
    delete user.password;

    if ((user.status || 'active') === 'suspended') {
      return respond(res, { error: "Konti yawe yahagaritswe. Vugana n'ubuyobozi." }, 403);
    }

    req.session.user = user;
    return respond(res, { success: true, message: 'Murakaza neza!', user });
  }

  if (action === 'register' && req.method === 'POST') {
    const name = String(input.name || '').trim();
    const email = String(input.email || '').trim();
    const phone = String(input.phone || '').trim();
    const district = input.district || '';
    const role = input.role || 'buyer';
    const password = String(input.password || '');

    if (!name || !email || !phone || !district || !password) {
      return respond(res, { error: 'Uzuza amakuru yose' }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return respond(res, { error: 'Email ntariyo' }, 400);
    }

    if (!/^07[2-9]\d{7}$/.test(phone)) {
      return respond(res, { error: 'Numero ya telefoni ntariyo (urugero: 0788123456)' }, 400);
    }

    if (password.length < 6) {
      return respond(res, { error: "Ijambo ry'ibanga rigomba kuba nibura inyuguti 6" }, 400);
    }

    if (!['buyer', 'farmer'].includes(role)) {
      return respond(res, { error: 'Role ntiri mu rutonde' }, 400);
    }

    if (!['Kigali', 'Northern', 'Southern', 'Eastern', 'Western'].includes(district)) {
      return respond(res, { error: 'Akarere ntikari mu rutonde' }, 400);
    }

    const existing = await get('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    if (existing) {
      return respond(res, { error: 'Iyi email isanzwe ikoreshwa' }, 400);
    }

    const userId = generateId('u');
    const createdAt = monthlyStamp();
    const hashed = await bcrypt.hash(password, 10);

    const user = {
      id: userId,
      name,
      email: email.toLowerCase(),
      phone,
      district,
      role,
      password: hashed,
      status: 'active',
      createdAt,
    };

    await run(
      `INSERT INTO users (id, name, email, phone, district, role, password, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.name, user.email, user.phone, user.district, user.role, user.password, user.status, user.createdAt]
    );

    const safeUser = { ...user };
    delete safeUser.password;
    req.session.user = safeUser;

    return respond(res, { success: true, message: 'Konti yawe yaremwe neza!', user: safeUser });
  }

  if (action === 'logout') {
    req.session.destroy(() => {
      return respond(res, { success: true, message: 'Wasohotse neza' });
    });
    return;
  }

  if (action === 'me') {
    const user = req.session?.user || null;
    return respond(res, { user });
  }

  return respond(res, { error: 'Invalid action' }, 400);
}

async function productsHandlers(req, res) {
  const action = req.query.action || 'list';
  const input = getInput(req);

  if (action === 'list' && req.method === 'GET') {
    const viewer = req.session?.user || null;
    const isAdmin = viewer && viewer.role === 'admin';
    let rows = await all('SELECT * FROM products ORDER BY created_at DESC');

    if (!isAdmin) {
      rows = rows.filter((row) => {
        if (viewer && viewer.role === 'farmer' && row.farmer_id === viewer.id) {
          return true;
        }
        return (row.status || 'active') === 'active';
      });
    }

    const search = String(req.query.search || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();
    const district = String(req.query.district || '').trim();
    const sort = String(req.query.sort || 'newest');
    const farmerId = String(req.query.farmerId || '').trim();

    if (search) {
      rows = rows.filter((row) => {
        const haystack = [row.name, row.farmer_name, row.location, row.category].join(' ').toLowerCase();
        return haystack.includes(search);
      });
    }

    if (category && category !== 'all') {
      rows = rows.filter((row) => row.category === category);
    }

    if (district && district !== 'all') {
      rows = rows.filter((row) => row.district === district);
    }

    if (farmerId) {
      if (!viewer || (viewer.role !== 'admin' && viewer.id !== farmerId)) {
        return respond(res, { error: 'Forbidden' }, 403);
      }
      rows = rows.filter((row) => row.farmer_id === farmerId);
    }

    const products = (await Promise.all(rows.map(toProductRow))).filter(Boolean);

    if (sort === 'price-low') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-high') {
      products.sort((a, b) => b.price - a.price);
    } else {
      products.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }

    return respond(res, { success: true, products });
  }

  if (action === 'get' && req.method === 'GET') {
    const id = String(req.query.id || '').trim();
    if (!id) return respond(res, { error: 'Missing id' }, 400);

    const row = await get('SELECT * FROM products WHERE id = ?', [id]);
    if (!row) return respond(res, { error: 'Product not found' }, 404);

    return respond(res, { success: true, product: await toProductRow(row) });
  }

  if (action === 'add' && req.method === 'POST') {
    const user = requireRole(req, res, ['farmer', 'admin']);
    const name = String(input.name || '').trim();
    const category = String(input.category || '').trim();
    const price = Number(input.price || 0);
    const unit = String(input.unit || 'kg').trim();
    const quantity = Number(input.quantity || 0);
    const location = String(input.location || '').trim();
    const description = String(input.description || '').trim();
    const icon = String(input.icon || '🌾').trim();

    if (!name || !category || price < 1 || !location) {
      return respond(res, { error: 'Uzuza amakuru yose akenewe (izina, icyiciro, igiciro, ahantu)' }, 400);
    }
    if (name.length > 100) {
      return respond(res, { error: 'Izina ry\'igicuruzwa ni ndende cyane (max 100)' }, 400);
    }
    if (price > 10000000) {
      return respond(res, { error: 'Igiciro ni kinini cyane' }, 400);
    }
    if (quantity < 1) {
      return respond(res, { error: 'Ingano igomba kuba nibura 1' }, 400);
    }
    if (!['Imboga', 'Ibinyampeke', 'Imyumbati', 'Imyaka', 'Amata', 'Ibindi'].includes(category)) {
      return respond(res, { error: 'Icyiciro ntikiri mu rutonde' }, 400);
    }

    const newProduct = {
      id: generateId('p'),
      name,
      category,
      price,
      unit: unit || 'kg',
      quantity,
      farmerId: user.id,
      farmerName: user.name,
      district: user.district,
      location,
      description,
      icon: icon || '🌾',
      badge: 'Bishya',
      status: 'active',
      createdAt: monthlyStamp(),
    };

    await run(
      `INSERT INTO products (id, name, category, price, unit, quantity, farmer_id, farmer_name, district, location, description, icon, badge, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newProduct.id, newProduct.name, newProduct.category, newProduct.price, newProduct.unit, newProduct.quantity, newProduct.farmerId, newProduct.farmerName, newProduct.district, newProduct.location, newProduct.description, newProduct.icon, newProduct.badge, newProduct.status, newProduct.createdAt]
    );

    return respond(res, { success: true, message: 'Igicuruzwa cyongewe neza!', product: newProduct });
  }

  if (action === 'update' && req.method === 'POST') {
    const user = requireRole(req, res, ['farmer', 'admin']);
    const id = String(input.id || '').trim();
    if (!id) return respond(res, { error: 'Missing id' }, 400);

    const product = await get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) return respond(res, { error: 'Product not found' }, 404);

    if (product.farmer_id !== user.id && user.role !== 'admin') {
      return respond(res, { error: 'Ntabwo wemerewe guhindura iki gicuruzwa' }, 403);
    }

    const updates = [];
    const values = [];

    if (input.price !== undefined) {
      updates.push('price = ?');
      values.push(Math.max(1, Number(input.price || 0)));
    }
    if (input.quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(Math.max(0, Number(input.quantity || 0)));
    }
    if (input.name !== undefined && String(input.name).trim()) {
      updates.push('name = ?');
      values.push(String(input.name).trim());
    }
    if (input.location !== undefined && String(input.location).trim()) {
      updates.push('location = ?');
      values.push(String(input.location).trim());
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(String(input.description).trim());
    }
    if (input.status !== undefined && user.role === 'admin') {
      updates.push('status = ?');
      values.push(String(input.status));
    }
    if (input.unit !== undefined && String(input.unit).trim()) {
      updates.push('unit = ?');
      values.push(String(input.unit).trim());
    }

    if (updates.length === 0) {
      return respond(res, { success: true, message: 'Igicuruzwa cyahinduwe' });
    }

    values.push(id);
    await run(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);
    return respond(res, { success: true, message: 'Igicuruzwa cyahinduwe' });
  }

  if (action === 'delete' && req.method === 'POST') {
    const user = requireAuth(req, res);
    const id = String(input.id || '').trim();
    if (!id) return respond(res, { error: 'Missing id' }, 400);

    const row = await get('SELECT * FROM products WHERE id = ?', [id]);
    if (!row) return respond(res, { error: 'Product not found' }, 404);

    if (row.farmer_id !== user.id && user.role !== 'admin') {
      return respond(res, { error: 'Ntabwo wemerewe gusiba iki gicuruzwa' }, 403);
    }

    await run('DELETE FROM products WHERE id = ?', [id]);
    return respond(res, { success: true, message: 'Igicuruzwa cyasibwe' });
  }

  return respond(res, { error: 'Invalid action' }, 400);
}

async function ordersHandlers(req, res) {
  const action = req.query.action || 'list';
  const input = getInput(req);

  if (action === 'create' && req.method === 'POST') {
    const user = requireRole(req, res, ['buyer']);
    const items = Array.isArray(input.items) ? input.items : [];
    const note = String(input.note || '').trim();

    if (!items.length) {
      return respond(res, { error: 'Agasanduku nta kintu kirimo' }, 400);
    }

    const productRows = await all('SELECT * FROM products');
    const productMap = new Map(productRows.map((p) => [p.id, p]));
    const safeItems = [];
    let total = 0;

    for (const item of items) {
      const productId = String(item.productId || '').trim();
      const qty = Math.max(1, Number(item.qty || 1));
      const product = productMap.get(productId);

      if (!product) {
        return respond(res, { error: `Igicuruzwa nticyabonetse: ${productId}` }, 400);
      }

      if ((product.status || 'active') !== 'active') {
        return respond(res, { error: `${product.name} nticyakoreshwa` }, 400);
      }

      if (qty > Number(product.quantity)) {
        return respond(res, { error: `${product.name}: ingano ihari ni ${product.quantity} gusa` }, 400);
      }

      if (product.farmer_id === user.id) {
        return respond(res, { error: 'Ntushobora kugura igicuruzwa cyawe' }, 400);
      }

      const subtotal = Number(product.price) * qty;
      safeItems.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        qty,
        unit: product.unit,
        icon: product.icon || '🌾',
        farmerId: product.farmer_id,
        farmerName: product.farmer_name,
        subtotal,
      });
      total += subtotal;
    }

    for (const safeItem of safeItems) {
      const product = productMap.get(safeItem.productId);
      const nextQuantity = Math.max(0, Number(product.quantity) - safeItem.qty);
      const nextStatus = nextQuantity === 0 ? 'sold_out' : 'active';
      await run('UPDATE products SET quantity = ?, status = ? WHERE id = ?', [nextQuantity, nextStatus, safeItem.productId]);
    }

    const orderId = generateId('o');
    const now = monthlyStamp();
    await run(
      `INSERT INTO orders (id, user_id, user_name, user_phone, total, status, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [orderId, user.id, user.name, user.phone, total, note, now, now]
    );

    for (const item of safeItems) {
      await run(
        `INSERT INTO order_items (order_id, product_id, name, price, qty, unit, icon, farmer_id, farmer_name, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.name, item.price, item.qty, item.unit, item.icon, item.farmerId, item.farmerName, item.subtotal]
      );
    }

    return respond(res, {
      success: true,
      message: 'Order yawe yoherejwe! Umuhinzi azahamagara.',
      order: {
        id: orderId,
        userId: user.id,
        userName: user.name,
        userPhone: user.phone,
        items: safeItems,
        total,
        status: 'pending',
        note,
        createdAt: now,
      },
    });
  }

  if (action === 'list' && req.method === 'GET') {
    const user = requireAuth(req, res);
    const allOrders = await all('SELECT * FROM orders ORDER BY created_at DESC');
    let orders = [];

    if (user.role === 'admin') {
      orders = allOrders;
    } else if (user.role === 'buyer') {
      orders = allOrders.filter((order) => order.user_id === user.id);
    } else {
      const productRows = await all('SELECT id FROM products WHERE farmer_id = ?', [user.id]);
      const myProductIds = new Set(productRows.map((p) => p.id));
      orders = allOrders.filter((order) => {
        return (async () => {
          const items = await all('SELECT product_id, farmer_id FROM order_items WHERE order_id = ?', [order.id]);
          return items.some((item) => myProductIds.has(item.product_id) && item.farmer_id === user.id);
        })();
      });
    }

    const resolvedOrders = [];
    for (const order of orders) {
      const hydrated = await hydrateOrder(order);
      const buyer = await get('SELECT district FROM users WHERE id = ?', [order.user_id]);

      if (user.role === 'farmer') {
        hydrated.items = hydrated.items.filter((item) => item.farmerId === user.id);
        hydrated.farmerTotal = hydrated.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0);
      }

      hydrated.userName = maskName(hydrated.userName || '');
      hydrated.userPhone = ['confirmed', 'delivered'].includes(hydrated.status) ? hydrated.userPhone : null;
      hydrated.userDistrict = buyer ? buyer.district : null;
      hydrated.phoneHidden = !['confirmed', 'delivered'].includes(hydrated.status);
      resolvedOrders.push(hydrated);
    }

    return respond(res, { success: true, orders: resolvedOrders });
  }

  if (action === 'status' && req.method === 'POST') {
    const user = requireRole(req, res, ['farmer', 'admin']);
    const id = String(input.id || '').trim();
    const newStatus = String(input.status || '').trim();
    const allowed = ['pending', 'confirmed', 'delivered', 'cancelled'];

    if (!allowed.includes(newStatus)) {
      return respond(res, { error: 'Status ntariyo mu rutonde' }, 400);
    }

    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return respond(res, { error: 'Order not found' }, 404);
    }

    if (user.role !== 'admin') {
      const items = await all('SELECT farmer_id FROM order_items WHERE order_id = ?', [id]);
      const owns = items.some((item) => item.farmer_id === user.id);
      if (!owns) {
        return respond(res, { error: 'Forbidden' }, 403);
      }
    }

    await run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [newStatus, monthlyStamp(), id]);
    return respond(res, { success: true, message: 'Status yahinduwe' });
  }

  if (action === 'stats' && req.method === 'GET') {
    const user = requireRole(req, res, ['farmer', 'admin']);
    const productRows = user.role === 'admin'
      ? await all('SELECT id FROM products')
      : await all('SELECT id FROM products WHERE farmer_id = ?', [user.id]);
    const productIds = productRows.map((row) => row.id);

    const orderRows = await all('SELECT * FROM orders');
    let totalRevenue = 0;
    let farmerOrders = 0;
    let pending = 0;

    for (const order of orderRows) {
      const items = await all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        if (productIds.includes(item.product_id)) {
          farmerOrders += 1;
          totalRevenue += Number(item.subtotal);
          if ((order.status || 'pending') === 'pending') pending += 1;
        }
      }
    }

    return respond(res, {
      success: true,
      stats: {
        products: productIds.length,
        orders: farmerOrders,
        revenue: totalRevenue,
        pending,
      },
    });
  }

  return respond(res, { error: 'Invalid action' }, 400);
}

async function profileHandlers(req, res) {
  const action = req.query.action || '';
  const input = getInput(req);
  const user = requireAuth(req, res);

  if (action === 'get' && req.method === 'GET') {
    const row = await get('SELECT * FROM users WHERE id = ?', [user.id]);
    if (!row) return respond(res, { error: 'Umukoresha ntabonetse' }, 404);
    const safe = { ...row };
    delete safe.password;
    req.session.user = safe;
    return respond(res, { success: true, user: safe });
  }

  if (action === 'update' && req.method === 'POST') {
    const name = String(input.name || '').trim();
    const phone = String(input.phone || '').trim();
    const district = input.district || '';

    if (!name || !phone || !district) {
      return respond(res, { error: 'Uzuza amakuru yose' }, 400);
    }

    if (!/^07[2-9]\d{7}$/.test(phone)) {
      return respond(res, { error: 'Numero ya telefoni ntariyo' }, 400);
    }

    if (!['Kigali', 'Northern', 'Southern', 'Eastern', 'Western'].includes(district)) {
      return respond(res, { error: 'Akarere ntikiri mu rutonde' }, 400);
    }

    await run('UPDATE users SET name = ?, phone = ?, district = ? WHERE id = ?', [name, phone, district, user.id]);

    const updatedUser = { ...user, name, phone, district };
    req.session.user = updatedUser;

    if (user.role === 'farmer') {
      await run('UPDATE products SET farmer_name = ?, district = ? WHERE farmer_id = ?', [name, district, user.id]);
    }

    return respond(res, { success: true, message: 'Amakuru yahinduwe', user: updatedUser });
  }

  if (action === 'password' && req.method === 'POST') {
    const current = String(input.current || '').trim();
    const next = String(input.new || '').trim();

    if (!current || !next) {
      return respond(res, { error: 'Uzuza amakuru yose' }, 400);
    }
    if (next.length < 6) {
      return respond(res, { error: "Ijambo ry'ibanga rishya rigomba kuba nibura inyuguti 6" }, 400);
    }

    const row = await get('SELECT password FROM users WHERE id = ?', [user.id]);
    if (!row) return respond(res, { error: 'Umukoresha ntabonetse' }, 404);

    const valid = await bcrypt.compare(current, row.password);
    if (!valid) {
      return respond(res, { error: "Ijambo ry'ibanga rya kera ntiryo" }, 401);
    }

    await run('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(next, 10), user.id]);
    return respond(res, { success: true, message: "Ijambo ry'ibanga ryahinduwe" });
  }

  if (action === 'my-orders' && req.method === 'GET') {
    const rows = await all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
    const orders = [];
    for (const row of rows) {
      orders.push(await hydrateOrder(row));
    }
    return respond(res, { success: true, orders });
  }

  if (action === 'cancel-order' && req.method === 'POST') {
    const id = String(input.id || '').trim();
    if (!id) return respond(res, { error: 'Missing id' }, 400);

    const order = await get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [id, user.id]);
    if (!order) return respond(res, { error: 'Order ntabonetse' }, 404);
    if ((order.status || 'pending') !== 'pending') {
      return respond(res, { error: 'Iyi order ntishobora guhagarikwa ubu' }, 400);
    }

    await run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', ['cancelled', monthlyStamp(), id]);

    const items = await all('SELECT * FROM order_items WHERE order_id = ?', [id]);
    for (const item of items) {
      const product = await get('SELECT * FROM products WHERE id = ?', [item.product_id]);
      if (product) {
        const newQuantity = Number(product.quantity) + Number(item.qty);
        const newStatus = product.status === 'sold_out' && newQuantity > 0 ? 'active' : product.status;
        await run('UPDATE products SET quantity = ?, status = ? WHERE id = ?', [newQuantity, newStatus, product.id]);
      }
    }

    return respond(res, { success: true, message: 'Order yahagaritswe' });
  }

  return respond(res, { error: 'Invalid action' }, 400);
}

async function adminHandlers(req, res) {
  const action = req.query.action || '';
  const input = getInput(req);
  const user = requireRole(req, res, ['admin']);

  if (action === 'overview' && req.method === 'GET') {
    const userRows = await all('SELECT * FROM users');
    const productRows = await all('SELECT * FROM products');
    const orderRows = await all('SELECT * FROM orders');

    let totalRevenue = 0;
    let pendingOrders = 0;

    for (const order of orderRows) {
      if ((order.status || 'pending') === 'pending') pendingOrders += 1;
      if ((order.status || '') !== 'cancelled') totalRevenue += Number(order.total || 0);
    }

    const roleCounts = { admin: 0, farmer: 0, buyer: 0 };
    for (const row of userRows) {
      roleCounts[row.role] = (roleCounts[row.role] || 0) + 1;
    }

    return respond(res, {
      success: true,
      stats: {
        users: userRows.length,
        farmers: roleCounts.farmer,
        buyers: roleCounts.buyer,
        admins: roleCounts.admin,
        products: productRows.length,
        orders: orderRows.length,
        pendingOrders,
        revenue: totalRevenue,
      },
    });
  }

  if (action === 'users' && req.method === 'GET') {
    const role = String(req.query.role || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    let rows = await all('SELECT * FROM users ORDER BY created_at DESC');

    if (role && role !== 'all') rows = rows.filter((row) => row.role === role);
    if (search) {
      rows = rows.filter((row) => {
        const haystack = [row.name, row.email, row.phone].join(' ').toLowerCase();
        return haystack.includes(search);
      });
    }

    const users = rows.map((row) => {
      const safe = { ...row };
      delete safe.password;
      return safe;
    });

    return respond(res, { success: true, users });
  }

  if (action === 'user-status' && req.method === 'POST') {
    const id = String(input.id || '').trim();
    const status = String(input.status || '').trim();

    if (!['active', 'suspended'].includes(status)) {
      return respond(res, { error: 'Status ntariyo mu rutonde' }, 400);
    }
    if (id === user.id) {
      return respond(res, { error: 'Ntushobora guhindura konti yawe bwite' }, 400);
    }

    const row = await get('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return respond(res, { error: 'Umukoresha ntabonetse' }, 404);
    if (row.role === 'admin') {
      return respond(res, { error: 'Ntushobora guhagarika admin mwenzako' }, 403);
    }

    await run('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return respond(res, { success: true, message: 'Status yahinduwe' });
  }

  if (action === 'user-delete' && req.method === 'POST') {
    const id = String(input.id || '').trim();
    if (id === user.id) {
      return respond(res, { error: 'Ntushobora gusiba konti yawe' }, 400);
    }

    const target = await get('SELECT * FROM users WHERE id = ?', [id]);
    if (!target) return respond(res, { error: 'Umukoresha ntabonetse' }, 404);
    if (target.role === 'admin') {
      return respond(res, { error: 'Ntushobora gusiba admin mwenzako' }, 403);
    }

    await run('DELETE FROM users WHERE id = ?', [id]);

    if (target.role === 'farmer') {
      await run('DELETE FROM products WHERE farmer_id = ?', [id]);
    }

    return respond(res, { success: true, message: 'Umukoresha yasibwe' });
  }

  if (action === 'products' && req.method === 'GET') {
    const status = String(req.query.status || '').trim();
    const category = String(req.query.category || '').trim();
    let rows = await all('SELECT * FROM products ORDER BY created_at DESC');

    if (status && status !== 'all') rows = rows.filter((row) => (row.status || 'active') === status);
    if (category && category !== 'all') rows = rows.filter((row) => row.category === category);

    const products = await Promise.all(rows.map(toProductRow));
    return respond(res, { success: true, products: products.filter(Boolean) });
  }

  if (action === 'product-status' && req.method === 'POST') {
    const id = String(input.id || '').trim();
    const status = String(input.status || '').trim();

    if (!['active', 'suspended', 'sold_out'].includes(status)) {
      return respond(res, { error: 'Status ntariyo mu rutonde' }, 400);
    }

    const row = await get('SELECT * FROM products WHERE id = ?', [id]);
    if (!row) return respond(res, { error: 'Igicuruzwa nticyabonetse' }, 404);

    await run('UPDATE products SET status = ? WHERE id = ?', [status, id]);
    return respond(res, { success: true, message: 'Status yahinduwe' });
  }

  if (action === 'orders' && req.method === 'GET') {
    const status = String(req.query.status || '').trim();
    let rows = await all('SELECT * FROM orders ORDER BY created_at DESC');

    if (status && status !== 'all') rows = rows.filter((row) => (row.status || 'pending') === status);

    const orders = [];
    for (const row of rows) orders.push(await hydrateOrder(row));
    return respond(res, { success: true, orders });
  }

  if (action === 'analytics' && req.method === 'GET') {
    const orderRows = await all('SELECT * FROM orders');
    const productRows = await all('SELECT * FROM products');
    const sales = new Map();

    for (const order of orderRows) {
      if ((order.status || '') === 'cancelled') continue;
      const items = await all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        const productId = item.product_id;
        if (!sales.has(productId)) {
          sales.set(productId, {
            productId,
            name: item.name,
            icon: item.icon || '🌾',
            qty: 0,
            revenue: 0,
          });
        }
        const entry = sales.get(productId);
        entry.qty += Number(item.qty || 0);
        entry.revenue += Number(item.subtotal || 0);
      }
    }

    const topProducts = Array.from(sales.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    const byDistrict = {};
    for (const product of productRows) {
      const district = product.district || 'Unknown';
      if (!byDistrict[district]) byDistrict[district] = { district, products: 0, revenue: 0 };
      byDistrict[district].products += 1;
    }

    for (const order of orderRows) {
      if ((order.status || '') === 'cancelled') continue;
      const items = await all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        const product = productRows.find((row) => row.id === item.product_id);
        if (!product) continue;
        const district = product.district || 'Unknown';
        if (!byDistrict[district]) byDistrict[district] = { district, products: 0, revenue: 0 };
        byDistrict[district].revenue += Number(item.subtotal || 0);
      }
    }

    return respond(res, {
      success: true,
      topProducts,
      byDistrict: Object.values(byDistrict),
    });
  }

  return respond(res, { error: 'Invalid action' }, 400);
}

app.all('/api/:file', async (req, res) => {
  const file = req.params.file;
  const routeName = String(file || '').toLowerCase();

  try {
    if (routeName === 'auth.php') return await authHandlers(req, res);
    if (routeName === 'products.php') return await productsHandlers(req, res);
    if (routeName === 'orders.php') return await ordersHandlers(req, res);
    if (routeName === 'profile.php') return await profileHandlers(req, res);
    if (routeName === 'admin.php') return await adminHandlers(req, res);

    return respond(res, { error: 'Route not found' }, 404);
  } catch (error) {
    const status = error && error.status ? Number(error.status) : 500;
    const payload = error && error.payload ? error.payload : { error: 'Server error' };
    return respond(res, payload, status);
  }
});

app.get('*', (req, res, next) => {
  const requestPath = req.path;

  if (requestPath.startsWith('/api/')) {
    return next();
  }

  const target = requestPath === '/' ? 'index.html' : requestPath.replace(/^\//, '');
  const filePath = path.join(STATIC_ROOT, target);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }

  return res.sendFile(path.join(STATIC_ROOT, 'index.html'));
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`AgriMarket RW server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
