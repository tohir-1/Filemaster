'use strict';

const { getDb } = require('./db');

function upsertUser(telegramUser, referredBy = null) {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramUser.id);

  if (existing) {
    db.prepare(`
      UPDATE users SET
        first_name = ?,
        username = ?,
        last_used_at = ?
      WHERE telegram_id = ?
    `).run(
      telegramUser.first_name || existing.first_name,
      telegramUser.username || existing.username,
      now,
      telegramUser.id
    );
    return getUser(telegramUser.id);
  }

  // New user
  let validReferrer = null;
  if (referredBy && referredBy !== telegramUser.id) {
    const ref = db.prepare('SELECT telegram_id FROM users WHERE telegram_id = ?').get(referredBy);
    if (ref) {
      validReferrer = referredBy;
    }
  }

  db.prepare(`
    INSERT INTO users (
      telegram_id, first_name, username, language, registered_at, last_used_at, referred_by
    ) VALUES (?, ?, ?, 'uz', ?, ?, ?)
  `).run(
    telegramUser.id,
    telegramUser.first_name || null,
    telegramUser.username || null,
    now,
    now,
    validReferrer
  );

  if (validReferrer) {
    db.prepare('UPDATE users SET referral_count = referral_count + 1 WHERE telegram_id = ?').run(validReferrer);
  }

  return getUser(telegramUser.id);
}

function getUser(telegramId) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
}

function setLanguage(telegramId, lang) {
  const db = getDb();
  db.prepare('UPDATE users SET language = ? WHERE telegram_id = ?').run(lang, telegramId);
}

function incrementConversion(telegramId, type) {
  const db = getDb();
  const now = new Date().toISOString();
  const columnMap = {
    'pdf_to_word': 'pdf_to_word',
    'image_to_pdf': 'image_to_pdf',
    'merge_pdf': 'merge_pdf',
    'compress_pdf': 'compress_pdf',
    'word_to_pdf': 'word_to_pdf',
    'excel_to_pdf': 'excel_to_pdf'
  };
  const col = columnMap[type];
  if (!col) return;

  db.prepare(`
    UPDATE users SET
      total_conversions = total_conversions + 1,
      ${col} = ${col} + 1,
      last_used_at = ?
    WHERE telegram_id = ?
  `).run(now, telegramId);

  db.prepare(`
    INSERT INTO conversions (user_id, type, created_at) VALUES (?, ?, ?)
  `).run(telegramId, type, now);
}

function getStats(telegramId) {
  return getUser(telegramId);
}

function getAdminStats() {
  const db = getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const today = new Date().toISOString().slice(0, 10);
  const todayUsers = db.prepare(`
    SELECT COUNT(*) as c FROM users WHERE date(last_used_at) = date(?)
  `).get(today).c;
  const totalConversions = db.prepare('SELECT COALESCE(SUM(total_conversions), 0) as c FROM users').get().c;
  const byType = db.prepare(`
    SELECT
      COALESCE(SUM(pdf_to_word), 0) as pdf_to_word,
      COALESCE(SUM(image_to_pdf), 0) as image_to_pdf,
      COALESCE(SUM(merge_pdf), 0) as merge_pdf,
      COALESCE(SUM(compress_pdf), 0) as compress_pdf,
      COALESCE(SUM(word_to_pdf), 0) as word_to_pdf,
      COALESCE(SUM(excel_to_pdf), 0) as excel_to_pdf
    FROM users
  `).get();
  const activeUsers = db.prepare(`
    SELECT COUNT(*) as c FROM users WHERE last_used_at IS NOT NULL AND date(last_used_at) >= date('now', '-7 days')
  `).get().c;

  return {
    totalUsers,
    todayUsers,
    totalConversions,
    byType,
    activeUsers
  };
}

function getAllUsers(limit = 100) {
  const db = getDb();
  return db.prepare('SELECT telegram_id, first_name, username, total_conversions, registered_at FROM users ORDER BY registered_at DESC LIMIT ?').all(limit);
}

function getAllTelegramIds() {
  const db = getDb();
  return db.prepare('SELECT telegram_id FROM users').all().map(r => r.telegram_id);
}

module.exports = {
  upsertUser,
  getUser,
  setLanguage,
  incrementConversion,
  getStats,
  getAdminStats,
  getAllUsers,
  getAllTelegramIds
};
