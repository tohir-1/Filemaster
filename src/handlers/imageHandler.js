'use strict';

const path = require('path');
const config = require('../config/config');
const {
  createTempPath,
  downloadTelegramFile,
  deleteFileSafe
} = require('../utils/fileManager');
const { doneCancelKeyboard, mainMenuKeyboard } = require('../keyboards/mainMenu');
const logger = require('../utils/logger');

async function imageHandler(ctx) {
  ctx.session = ctx.session || {};

  if (ctx.session.mode !== 'image_to_pdf') {
    // Not in image mode
    return;
  }

  const photo = ctx.message?.photo;
  const doc = ctx.message?.document;

  let fileId = null;
  let fileName = 'image.jpg';
  let fileSize = 0;

  if (photo && photo.length) {
    // Largest photo
    const best = photo[photo.length - 1];
    fileId = best.file_id;
    fileSize = best.file_size || 0;
    fileName = `photo_${Date.now()}.jpg`;
  } else if (doc) {
    const ext = path.extname(doc.file_name || '').toLowerCase();
    if (!config.supportedImageExts.includes(ext) &&
        !config.supportedImageMimes.includes(doc.mime_type)) {
      await ctx.reply(ctx.t('error_invalid_format', { formats: 'JPG, PNG, WEBP' }));
      return;
    }
    fileId = doc.file_id;
    fileName = doc.file_name || 'image' + ext;
    fileSize = doc.file_size || 0;
  } else {
    return;
  }

  if (fileSize > config.maxFileSizeBytes) {
    await ctx.reply(ctx.t('error_file_too_large', { max: config.maxFileSizeMB }));
    return;
  }

  try {
    const dest = createTempPath(ctx.from.id, fileName, 'img_');
    await downloadTelegramFile(ctx, fileId, dest);
    ctx.session.files = ctx.session.files || [];
    ctx.session.files.push(dest);

    await ctx.reply(
      ctx.t('image_added', { count: ctx.session.files.length }),
      doneCancelKeyboard(ctx.t)
    );
  } catch (err) {
    logger.error('imageHandler error', err);
    await ctx.reply(ctx.t('error_generic'));
  }
}

module.exports = { imageHandler };
