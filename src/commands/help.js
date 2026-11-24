'use strict';

const { mainMenuKeyboard } = require('../keyboards/mainMenu');
const config = require('../config/config');
const { getUser } = require('../database/users');

async function helpCommand(ctx) {
  await ctx.reply(ctx.t('help'), mainMenuKeyboard(ctx.t));
}

async function aboutCommand(ctx) {
  await ctx.reply(ctx.t('about'), mainMenuKeyboard(ctx.t));
}

async function statsCommand(ctx) {
  const user = getUser(ctx.from.id);
  if (!user) {
    await ctx.reply(ctx.t('error_generic'));
    return;
  }

  const last = user.last_used_at
    ? new Date(user.last_used_at).toLocaleString()
    : '-';

  const text = [
    ctx.t('stats_title'),
    '',
    ctx.t('stats_total', { total: user.total_conversions || 0 }),
    ctx.t('stats_pdf_word', { n: user.pdf_to_word || 0 }),
    ctx.t('stats_image_pdf', { n: user.image_to_pdf || 0 }),
    ctx.t('stats_merge', { n: user.merge_pdf || 0 }),
    ctx.t('stats_compress', { n: user.compress_pdf || 0 }),
    ctx.t('stats_word_pdf', { n: user.word_to_pdf || 0 }),
    ctx.t('stats_excel_pdf', { n: user.excel_to_pdf || 0 }),
    ctx.t('stats_last', { date: last })
  ].join('\n');

  // Referral info
  const link = `https://t.me/${config.botUsername}?start=${ctx.from.id}`;
  const refText = ctx.t('referral', { link, count: user.referral_count || 0 });

  await ctx.reply(text + '\n\n' + refText, mainMenuKeyboard(ctx.t));
}

module.exports = { helpCommand, aboutCommand, statsCommand };
