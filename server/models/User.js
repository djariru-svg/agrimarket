import { getDatabase } from '../config/database.js';

export class UserModel {
  static create({ name, email, phone, district, role, password }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO users (name, email, phone, district, role, password)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(name, email, phone, district, role, password);
  }

  static findByEmail(email) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  static findById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  static all() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  }

  static updateStatus(id, status) {
    const db = getDatabase();
    return db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
  }
}
