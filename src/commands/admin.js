'use strict';

const fs = require('fs');
const path = require('path');
const { isAdmin } = require('../middleware/auth');
const { getAdminStats, getAllUsers, getAllTelegramIds } = require('../database/users');
const { adminMenuKeyboard } = require('../keyboards/adminMenu');
const { mainMenuKeyboard } = require('../keyboards/mainMenu');
const config = require('../config/config');
const logger = require('../utils/logger');

async function adminCommand(ctx) {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply(ctx.t('admin_only'));
    return;
  }
  await ctx.reply(ctx.t('admin_panel'), adminMenuKeyboard(ctx.t));
}

async function handleAdminCallback(ctx) {
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCbQuery(ctx.t('admin_only'));
    return;
  }

  const data = ctx.callbackQuery.data;
  await ctx.answerCbQuery();

  if (data === 'admin:stats') {
    const s = getAdminStats();
    const text = [
      '📊 Admin Statistics',
      '',
      `Total users: ${s.totalUsers}`,
      `Today active: ${s.todayUsers}`,
      `Active (7d): ${s.activeUsers}`,
      `Total conversions: ${s.totalConversions}`,
      '',
      `PDF→Word: ${s.byType.pdf_to_word}`,
      `Image→PDF: ${s.byType.image_to_pdf}`,
      `Merge PDF: ${s.byType.merge_pdf}`,
      `Compress: ${s.byType.compress_pdf}`,
      `Word→PDF: ${s.byType.word_to_pdf}`,
      `Excel→PDF: ${s.byType.excel_to_pdf}`
    ].join('\n');
    await ctx.reply(text, adminMenuKeyboard(ctx.t));
  } else if (data === 'admin:users') {
    const users = getAllUsers(30);
    let text = '👥 Recent users (max 30):\n\n';
    for (const u of users) {
      text += `• ${u.first_name || '-'} (@${u.username || '-'}) ID:${u.telegram_id} conv:${u.total_conversions}\n`;
    }
    if (text.length > 4000) text = text.slice(0, 4000) + '...';
    await ctx.reply(text, adminMenuKeyboard(ctx.t));
  } else if (data === 'admin:broadcast') {
    ctx.session = ctx.session || {};
    ctx.session.mode = 'admin_broadcast';
    await ctx.reply(ctx.t('broadcast_prompt'));
  } else if (data === 'admin:status') {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    const mem = process.memoryUsage();
    const text = [
      '📡 Bot Status',
      '',
      `Uptime: ${hours}h ${mins}m`,
      `Memory RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
      `Node: ${process.version}`,
      `Platform: ${process.platform}`
    ].join('\n');
    await ctx.reply(text, adminMenuKeyboard(ctx.t));
  } else if (data === 'admin:logs') {
    try {
      const logDir = config.logsDir;
      const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log')).sort().reverse();
      if (files.length === 0) {
        await ctx.reply('No log files yet.', adminMenuKeyboard(ctx.t));
        return;
      }
      const latest = path.join(logDir, files[0]);
      const content = fs.readFileSync(latest, 'utf8');
      const lines = content.split('\n').filter(l => l.includes('[ERROR]')).slice(-20);
      const text = lines.length ? lines.join('\n') : 'No recent errors.';
      await ctx.reply(text.slice(0, 4000), adminMenuKeyboard(ctx.t));
    } catch (e) {
      await ctx.reply('Could not read logs: ' + e.message, adminMenuKeyboard(ctx.t));
    }
  }
}

async function handleBroadcastMessage(ctx) {
  if (!isAdmin(ctx.from.id) || ctx.session?.mode !== 'admin_broadcast') return false;

  const message = ctx.message?.text;
  if (!message) return false;

  ctx.session.mode = null;
  const ids = getAllTelegramIds();
  let success = 0;
  for (const id of ids) {
    try {
      await ctx.telegram.sendMessage(id, message);
      success++;
      // small delay to avoid flood limits
      await new Promise(r => setTimeout(r, 35));
    } catch (e) {
      // user blocked bot etc.
    }
  }
  await ctx.reply(ctx.t('broadcast_done', { count: success }), mainMenuKeyboard(ctx.t));
  return true;
}

module.exports = { adminCommand, handleAdminCallback, handleBroadcastMessage };
