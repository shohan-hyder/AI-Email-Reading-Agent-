/**
 * Database Layer
 * Supports: Supabase (PostgreSQL) + SQLite fallback
 * Ensures duplicate prevention works offline
 */

const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'emails.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[DB] Created data directory at ${DATA_DIR}`);
}

// SQLite connection pool
let db = null;

function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error(`[DB] Error opening SQLite: ${err.message}`);
        return reject(err);
      }
      console.log(`[DB] Connected to SQLite at ${DB_PATH}`);
      createTables().then(resolve).catch(reject);
    });
  });
}

function createTables() {
  return new Promise((resolve, reject) => {
    // Processed emails table (for duplicate prevention)
    db.run(
      `
      CREATE TABLE IF NOT EXISTS processed_emails (
        id TEXT PRIMARY KEY,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `,
      (err) => {
        if (err && !err.message.includes('already exists')) {
          return reject(err);
        }
        console.log('[DB] Table processed_emails ready');
      },
    );

    // Email notifications table (backup storage)
    db.run(
      `
      CREATE TABLE IF NOT EXISTS email_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT UNIQUE NOT NULL,
        sender TEXT,
        sender_email TEXT,
        subject TEXT,
        body_preview TEXT,
        priority TEXT,
        category TEXT,
        reason TEXT,
        received_at TIMESTAMP,
        is_read BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `,
      (err) => {
        if (err && !err.message.includes('already exists')) {
          return reject(err);
        }
        console.log('[DB] Table email_notifications ready');
        resolve();
      },
    );
  });
}

async function isProcessed(emailId) {
  if (!db) return false;

  return new Promise((resolve) => {
    db.get('SELECT id FROM processed_emails WHERE id = ?', [emailId], (err, row) => {
      if (err) {
        console.error(`[DB] Error checking processed: ${err.message}`);
        return resolve(false);
      }
      resolve(!!row);
    });
  });
}

async function markProcessed(emailId) {
  if (!db) return;

  return new Promise((resolve) => {
    db.run('INSERT OR IGNORE INTO processed_emails (id) VALUES (?)', [emailId], (err) => {
      if (err) {
        console.error(`[DB] Error marking processed: ${err.message}`);
      }
      resolve();
    });
  });
}

async function saveNotification(email, classification) {
  if (!db) return;

  const bodyPreview = email.body ? email.body.slice(0, 300).replace(/\s+/g, ' ').trim() : '';

  return new Promise((resolve) => {
    db.run(
      `
      INSERT OR IGNORE INTO email_notifications 
      (email_id, sender, sender_email, subject, body_preview, priority, category, reason, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        email.id,
        email.from_name || email.from,
        email.from,
        email.subject,
        bodyPreview,
        classification.priority,
        classification.category,
        classification.reason,
        email.received_at || new Date().toISOString(),
      ],
      (err) => {
        if (err) {
          console.error(`[DB] Error saving notification: ${err.message}`);
          resolve(false);
        } else {
          resolve(true);
        }
      },
    );
  });
}

async function getNotifications(filters = {}) {
  if (!db) return [];

  return new Promise((resolve) => {
    let query = 'SELECT * FROM email_notifications WHERE 1=1';
    const params = [];

    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    query += ' ORDER BY received_at DESC LIMIT ? OFFSET ?';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    params.push(limit, offset);

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error(`[DB] Error fetching notifications: ${err.message}`);
        return resolve([]);
      }
      resolve(rows || []);
    });
  });
}

async function deleteNotification(emailId) {
  if (!db) return;

  return new Promise((resolve) => {
    db.run('DELETE FROM email_notifications WHERE email_id = ?', [emailId], (err) => {
      if (err) {
        console.error(`[DB] Error deleting notification: ${err.message}`);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

async function markAsRead(emailId) {
  if (!db) return;

  return new Promise((resolve) => {
    db.run('UPDATE email_notifications SET is_read = 1 WHERE email_id = ?', [emailId], (err) => {
      if (err) {
        console.error(`[DB] Error marking as read: ${err.message}`);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

async function getStats() {
  if (!db) return { total: 0, unread: 0, byPriority: {}, byCategory: {} };

  return new Promise((resolve) => {
    db.all(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
        priority,
        category
      FROM email_notifications
      GROUP BY priority, category
      `,
      (err, rows) => {
        if (err) {
          console.error(`[DB] Error fetching stats: ${err.message}`);
          return resolve({ total: 0, unread: 0, byPriority: {}, byCategory: {} });
        }

        const stats = {
          total: rows.reduce((sum, r) => sum + r.total, 0),
          unread: rows.reduce((sum, r) => sum + (r.unread || 0), 0),
          byPriority: {},
          byCategory: {},
        };

        rows.forEach((row) => {
          stats.byPriority[row.priority] = (stats.byPriority[row.priority] || 0) + row.total;
          stats.byCategory[row.category] = (stats.byCategory[row.category] || 0) + row.total;
        });

        resolve(stats);
      },
    );
  });
}

async function resetAll() {
  if (!db) return;

  return new Promise((resolve) => {
    db.serialize(() => {
      db.run('DELETE FROM processed_emails', (err) => {
        if (err) console.error(`[DB] Error resetting processed_emails: ${err.message}`);
      });
      db.run('DELETE FROM email_notifications', (err) => {
        if (err) console.error(`[DB] Error resetting email_notifications: ${err.message}`);
        else console.log('[DB] All tables reset');
        resolve();
      });
    });
  });
}

async function closeDB() {
  if (!db) return;

  return new Promise((resolve) => {
    db.close((err) => {
      if (err) console.error(`[DB] Error closing: ${err.message}`);
      else console.log('[DB] Connection closed');
      resolve();
    });
  });
}

module.exports = {
  initDB,
  isProcessed,
  markProcessed,
  saveNotification,
  getNotifications,
  deleteNotification,
  markAsRead,
  getStats,
  resetAll,
  closeDB,
};
