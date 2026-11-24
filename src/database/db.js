'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

let db = null;

function initDatabase() {
  const dbPath = config.databasePath;
  const dir = path.dirname(dbPath);
  if (dir && dir !== '.') {
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      telegram_id INTEGER UNIQUE NOT NULL,
      first_name TEXT,
      username TEXT,
      language TEXT DEFAULT 'uz',
      registered_at TEXT NOT NULL,
      last_used_at TEXT,
      total_conversions INTEGER DEFAULT 0,
      pdf_to_word INTEGER DEFAULT 0,
      image_to_pdf INTEGER DEFAULT 0,
      merge_pdf INTEGER DEFAULT 0,
      compress_pdf INTEGER DEFAULT 0,
      word_to_pdf INTEGER DEFAULT 0,
      excel_to_pdf INTEGER DEFAULT 0,
      referred_by INTEGER,
      referral_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_conversions_user ON conversions(user_id);
  `);

  logger.info('SQLite database ready');
  return db;
}

function getDb() {
  if (!db) {
    initDatabase();
  }
  return db;
}

module.exports = { initDatabase, getDb };
