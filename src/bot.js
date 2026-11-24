'use strict';

const { Telegraf, session } = require('telegraf');
const config = require('./config/config');
const { languageMiddleware } = require('./middleware/language');
const { startCommand } = require('./commands/start');
const { helpCommand, aboutCommand, statsCommand } = require('./commands/help');
const { adminCommand, handleBroadcastMessage } = require('./commands/admin');
const { documentHandler, finishMerge } = require('./handlers/documentHandler');
const { imageHandler } = require('./handlers/imageHandler');
const { callbackHandler, processImagesToPdf } = require('./handlers/callbackHandler');
const { mainMenuKeyboard, cancelKeyboard, doneCancelKeyboard, languageKeyboard, pageSizeKeyboard } = require('./keyboards/mainMenu');
const { deleteFileSafe } = require('./utils/fileManager');
const logger = require('./utils/logger');

const bot = new Telegraf(config.botToken);

// Session middleware (in-memory)
bot.use(session());

// Language middleware
bot.use(languageMiddleware());

// Error handler
bot.catch((err, ctx) => {
  logger.error('Bot error', { error: err.message, stack: err.stack, user: ctx.from?.id });
  ctx.reply(ctx.t ? ctx.t('error_generic') : 'Error occurred').catch(() => {});
});

// /start
bot.start(startCommand);

// /help
bot.help(helpCommand);

// /admin
bot.command('admin', adminCommand);

// /cancel
bot.command('cancel', async (ctx) => {
  ctx.session = ctx.session || {};
  if (ctx.session.files) {
    for (const f of ctx.session.files) deleteFileSafe(f);
  }
  ctx.session.mode = null;
  ctx.session.files = [];
  ctx.session.options = {};
  await ctx.reply(ctx.t('cancelled'), mainMenuKeyboard(ctx.t));
});

// /done
bot.command('done', async (ctx) => {
  ctx.session = ctx.session || {};
  if (ctx.session.mode === 'merge_pdf') {
    await finishMerge(ctx);
  } else if (ctx.session.mode === 'image_to_pdf') {
    // Need page size / orientation if not set
    if (!ctx.session.options?.pageSize) {
      await ctx.reply(ctx.t('choose_page_size'), pageSizeKeyboard(ctx.t));
      return;
    }
    if (!ctx.session.options?.orientation) {
      const { orientationKeyboard } = require('./keyboards/mainMenu');
      await ctx.reply(ctx.t('choose_orientation'), orientationKeyboard(ctx.t));
      return;
    }
    await processImagesToPdf(ctx);
  } else {
    await ctx.reply(ctx.t('choose_service'), mainMenuKeyboard(ctx.t));
  }
});

// Text button handlers (reply keyboard)
bot.hears(/.*/, async (ctx, next) => {
  // First check broadcast
  const handled = await handleBroadcastMessage(ctx);
  if (handled) return;

  const text = ctx.message?.text;
  if (!text) return next();

  const t = ctx.t;

  // Match against translated button texts
  if (text === t('btn_pdf_to_word')) {
    ctx.session = ctx.session || {};
    ctx.session.mode = 'pdf_to_word';
    ctx.session.files = [];
    await ctx.reply(t('send_pdf'), cancelKeyboard(t));
    return;
  }
  if (text === t('btn_image_to_pdf')) {
    ctx.session = ctx.session || {};
    ctx.session.mode = 'image_to_pdf';
    ctx.session.files = [];
    ctx.session.options = {};
    await ctx.reply(t('choose_page_size'), pageSizeKeyboard(t));
    return;
  }
  if (text === t('btn_merge_pdf')) {
    ctx.session = ctx.session || {};
    ctx.session.mode = 'merge_pdf';
    ctx.session.files = [];
    await ctx.reply(t('send_pdfs_merge'), doneCancelKeyboard(t));
    return;
  }
  if (text === t('btn_compress_pdf')) {
    ctx.session = ctx.session || {};
    ctx.session.mode = 'compress_pdf';
    ctx.session.files = [];
    await ctx.reply(t('send_pdf'), cancelKeyboard(t));
    return;
  }
  if (text === t('btn_word_to_pdf')) {
    ctx.session = ctx.session || {};
    ctx.session.mode = 'word_to_pdf';
    ctx.session.files = [];
    await ctx.reply(t('send_word'), cancelKeyboard(t));
    return;
  }
  if (text === t('btn_excel_to_pdf')) {
    ctx.session = ctx.session || {};
    ctx.session.mode = 'excel_to_pdf';
    ctx.session.files = [];
    await ctx.reply(t('send_excel'), cancelKeyboard(t));
    return;
  }
  if (text === t('btn_stats')) {
    return statsCommand(ctx);
  }
  if (text === t('btn_lang')) {
    await ctx.reply(t('btn_lang'), languageKeyboard(t));
    return;
  }
  if (text === t('btn_about')) {
    return aboutCommand(ctx);
  }
  if (text === t('btn_help')) {
    return helpCommand(ctx);
  }
  if (text === t('btn_cancel')) {
    ctx.session = ctx.session || {};
    if (ctx.session.files) {
      for (const f of ctx.session.files) deleteFileSafe(f);
    }
    ctx.session.mode = null;
    ctx.session.files = [];
    await ctx.reply(t('cancelled'), mainMenuKeyboard(t));
    return;
  }
  if (text === t('btn_done') || text === '/done') {
    // handled by command, but also as text
    if (ctx.session?.mode === 'merge_pdf') {
      await finishMerge(ctx);
      return;
    }
    if (ctx.session?.mode === 'image_to_pdf') {
      if (!ctx.session.options?.pageSize) {
        await ctx.reply(t('choose_page_size'), pageSizeKeyboard(t));
        return;
      }
      await processImagesToPdf(ctx);
      return;
    }
  }

  return next();
});

// Callback queries
bot.on('callback_query', callbackHandler);

// Documents
bot.on('document', documentHandler);

// Photos
bot.on('photo', imageHandler);

// Also accept images sent as documents (already handled in document if mode matches, but imageHandler covers photo)

module.exports = { bot };
