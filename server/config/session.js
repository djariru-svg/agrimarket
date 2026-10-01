import { getDatabase } from './database.js';

export class SqliteSessionStore {
  constructor() {
    this.db = getDatabase();
  }

  get(sid, callback) {
    try {
      const stmt = this.db.prepare('SELECT sess FROM sessions WHERE sid = ?');
      const row = stmt.get(sid);
      
      if (!row) {
        return callback(null, null);
      }

      const sess = JSON.parse(row.sess);
      callback(null, sess);
    } catch (err) {
      callback(err);
    }
  }

  set(sid, sess, callback) {
    try {
      const expire = sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 24 * 60 * 60 * 1000;
      const data = JSON.stringify(sess);
      
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO sessions (sid, sess, expire) 
        VALUES (?, ?, ?)
      `);
      stmt.run(sid, data, expire);
      
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      const stmt = this.db.prepare('DELETE FROM sessions WHERE sid = ?');
      stmt.run(sid);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  clear(callback) {
    try {
      this.db.exec('DELETE FROM sessions');
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

export function createSessionStore() {
  return new SqliteSessionStore();
}
