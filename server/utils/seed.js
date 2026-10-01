import { getDatabase } from '../config/database.js';
import bcryptjs from 'bcryptjs';

const db = getDatabase();

const seedUsers = [
  { name: 'Admin', email: 'admin@agrimarket.rw', phone: '+250788000001', district: 'Kigali', role: 'admin', password: 'admin123' },
  { name: 'Jean', email: 'jean@farm.rw', phone: '+250788000002', district: 'Northern', role: 'farmer', password: 'farmer123' },
  { name: 'Claire', email: 'claire@farm.rw', phone: '+250788000003', district: 'Southern', role: 'farmer', password: 'farmer123' },
  { name: 'Eric', email: 'eric@farm.rw', phone: '+250788000004', district: 'Eastern', role: 'farmer', password: 'farmer123' },
  { name: 'Marie', email: 'marie@farm.rw', phone: '+250788000005', district: 'Western', role: 'farmer', password: 'farmer123' },
  { name: 'Paul', email: 'paul@farm.rw', phone: '+250788000006', district: 'Eastern', role: 'farmer', password: 'farmer123' },
  { name: 'Alice', email: 'alice@buyer.rw', phone: '+250788000007', district: 'Kigali', role: 'buyer', password: 'buyer123' }
];

const seedProducts = [
  { name: 'Ibihaza', category: 'Imboga', price: 500, unit: 'kg', quantity: 30, farmer_id: 2, location: 'Musanze', description: 'Fresh green vegetables', icon: '🥬', badge: 'Popular' },
  { name: 'Amashaza', category: 'Ibinyampeke', price: 1200, unit: 'kg', quantity: 25, farmer_id: 3, location: 'Huye', description: 'Quality beans', icon: '🫘', badge: 'Fresh' },
  { name: 'Ibijumba', category: 'Imyumbati', price: 400, unit: 'kg', quantity: 40, farmer_id: 4, location: 'Rwamagana', description: 'Sweet potatoes from local farms', icon: '🍠', badge: 'Local' },
  { name: 'Imineke', category: 'Imyaka', price: 800, unit: 'bunch', quantity: 18, farmer_id: 5, location: 'Rubavu', description: 'Ripe bananas', icon: '🍌', badge: 'Popular' },
  { name: 'Amata y\'inka', category: 'Amata', price: 600, unit: 'liter', quantity: 50, farmer_id: 6, location: 'Nyagatare', description: 'Fresh cow milk', icon: '🥛', badge: 'Healthy' },
  { name: 'Tomatisi', category: 'Imboga', price: 700, unit: 'kg', quantity: 22, farmer_id: 2, location: 'Gicumbi', description: 'Fresh tomatoes', icon: '🍅', badge: 'Farm Fresh' },
  { name: 'Ibigori', category: 'Ibinyampeke', price: 450, unit: 'kg', quantity: 60, farmer_id: 3, location: 'Nyanza', description: 'Corn harvested this week', icon: '🌽', badge: 'New' },
  { name: 'Amacunga', category: 'Imyaka', price: 1500, unit: 'kg', quantity: 12, farmer_id: 4, location: 'Bugesera', description: 'Sweet oranges', icon: '🍊', badge: 'Premium' }
];

export function seedDatabase() {
  try {
    // Clear tables
    db.exec('DELETE FROM ai_conversations');
    db.exec('DELETE FROM order_items');
    db.exec('DELETE FROM orders');
    db.exec('DELETE FROM products');
    db.exec('DELETE FROM users');

    // Insert users
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, phone, district, role, password, status, language, theme, color_theme)
      VALUES (?, ?, ?, ?, ?, ?, 'active', 'rw', 'light', 'green')
    `);

    for (const user of seedUsers) {
      const hashedPassword = bcryptjs.hashSync(user.password, 10);
      insertUser.run(user.name, user.email, user.phone, user.district, user.role, hashedPassword);
    }

    // Insert products
    const insertProduct = db.prepare(`
      INSERT INTO products (name, category, price, unit, quantity, farmer_id, location, description, icon, badge, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    for (const product of seedProducts) {
      insertProduct.run(product.name, product.category, product.price, product.unit, product.quantity, product.farmer_id, product.location, product.description, product.icon, product.badge || '');
    }

    console.log('✅ Seed data inserted successfully');
    return true;
  } catch (error) {
    console.error('Seed error:', error);
    return false;
  }
}

if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}
