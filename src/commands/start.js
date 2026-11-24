'use strict';

const { upsertUser } = require('../database/users');
const { mainMenuKeyboard } = require('../keyboards/mainMenu');
const config = require('../config/config');

async function startCommand(ctx) {
  const from = ctx.from;
  if (!from) return;

  // Referral: /start 123456789
  let referredBy = null;
  const payload = ctx.startPayload || (ctx.message?.text || '').split(' ')[1];
  if (payload && /^\d+$/.test(payload)) {
    referredBy = parseInt(payload, 10);
  }

  upsertUser(from, referredBy);

  // Clear any previous session
  ctx.session = ctx.session || {};
  ctx.session.mode = null;
  ctx.session.files = [];
  ctx.session.options = {};

  const text = ctx.t('welcome') + '\n\n' + ctx.t('choose_service');
  await ctx.reply(text, mainMenuKeyboard(ctx.t));
}

module.exports = { startCommand };
