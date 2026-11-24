'use strict';

const { setLanguage } = require('../database/users');
const { mainMenuKeyboard, languageKeyboard, pageSizeKeyboard, orientationKeyboard, doneCancelKeyboard } = require('../keyboards/mainMenu');
const { handleAdminCallback } = require('../commands/admin');
const { imagesToPdf } = require('../services/imageToPdf');
const { incrementConversion } = require('../database/users');
const { deleteFileSafe, getUserTempDir } = require('../utils/fileManager');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function callbackHandler(ctx) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  // Admin callbacks
  if (data.startsWith('admin:')) {
    return handleAdminCallback(ctx);
  }

  if (data.startsWith('lang:')) {
    const lang = data.split(':')[1];
    if (['uz', 'ru', 'en'].includes(lang)) {
      setLanguage(ctx.from.id, lang);
      ctx.lang = lang;
      // Re-bind t for this context
      const { t } = require('../middleware/language');
      ctx.t = (key, params) => t(lang, key, params);
      await ctx.answerCbQuery();
      await ctx.reply(ctx.t('lang_changed'), mainMenuKeyboard(ctx.t));
    }
    return;
  }

  if (data === 'back_main') {
    await ctx.answerCbQuery();
    ctx.session = ctx.session || {};
    ctx.session.mode = null;
    ctx.session.files = [];
    await ctx.reply(ctx.t('choose_service'), mainMenuKeyboard(ctx.t));
    return;
  }

  if (data === 'cancel_action') {
    await ctx.answerCbQuery();
    ctx.session = ctx.session || {};
    // cleanup files
    if (ctx.session.files) {
      for (const f of ctx.session.files) deleteFileSafe(f);
    }
    ctx.session.mode = null;
    ctx.session.files = [];
    ctx.session.options = {};
    await ctx.reply(ctx.t('cancelled'), mainMenuKeyboard(ctx.t));
    return;
  }

  // Image to PDF options
  if (data.startsWith('pagesize:')) {
    await ctx.answerCbQuery();
    const size = data.split(':')[1];
    ctx.session = ctx.session || {};
    ctx.session.options = ctx.session.options || {};
    ctx.session.options.pageSize = size;
    await ctx.reply(ctx.t('choose_orientation'), orientationKeyboard(ctx.t));
    return;
  }

  if (data.startsWith('orient:')) {
    await ctx.answerCbQuery();
    const orient = data.split(':')[1];
    ctx.session = ctx.session || {};
    ctx.session.options = ctx.session.options || {};
    ctx.session.options.orientation = orient;

    // If we already have images collected, process now
    if (ctx.session.mode === 'image_to_pdf' && ctx.session.files?.length > 0) {
      await processImagesToPdf(ctx);
    } else {
      await ctx.reply(ctx.t('send_image'), doneCancelKeyboard(ctx.t));
    }
    return;
  }
}

async function processImagesToPdf(ctx) {
  const files = ctx.session.files || [];
  if (files.length === 0) {
    await ctx.reply(ctx.t('image_need_one'));
    return;
  }

  const statusMsg = await ctx.reply(ctx.t('converting'));
  try {
    const options = {
      pageSize: ctx.session.options?.pageSize || 'A4',
      orientation: ctx.session.options?.orientation || 'portrait',
      userId: ctx.from.id
    };
    const outPath = await imagesToPdf(files, options);

    await ctx.replyWithDocument({
      source: outPath,
      filename: 'images.pdf'
    });

    incrementConversion(ctx.from.id, 'image_to_pdf');
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      null,
      ctx.t('success')
    ).catch(() => {});

    // cleanup
    for (const f of files) deleteFileSafe(f);
    deleteFileSafe(outPath);
  } catch (err) {
    logger.error('imagesToPdf process error', err);
    await ctx.reply(ctx.t('error_generic') + '\n' + (err.message || ''));
  } finally {
    ctx.session.mode = null;
    ctx.session.files = [];
    ctx.session.options = {};
    await ctx.reply(ctx.t('choose_service'), mainMenuKeyboard(ctx.t));
  }
}

module.exports = { callbackHandler, processImagesToPdf };
