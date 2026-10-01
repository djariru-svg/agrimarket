import { getDatabase } from '../config/database.js';

export class OrderModel {
  static create({ user_id, total, note }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO orders (user_id, total, status, note)
      VALUES (?, ?, 'pending', ?)
    `);
    return stmt.run(user_id, total, note || '');
  }

  static findById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  }

  static byUser(userId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  }

  static all() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  }

  static updateStatus(id, status) {
    const db = getDatabase();
    return db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  }
}
