import { getDatabase } from '../config/database.js';

export class ProductModel {
  static create({ name, category, price, unit, quantity, farmer_id, location, description, icon }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO products (name, category, price, unit, quantity, farmer_id, location, description, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(name, category, price, unit, quantity, farmer_id, location, description, icon);
  }

  static findById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  }

  static all() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  }

  static byFarmer(farmerId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM products WHERE farmer_id = ? ORDER BY created_at DESC').all(farmerId);
  }

  static update(id, data) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    values.push(id);
    const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    return db.prepare(sql).run(...values);
  }
}
