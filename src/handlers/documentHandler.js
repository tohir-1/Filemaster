'use strict';

const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const {
  createTempPath,
  downloadTelegramFile,
  deleteFileSafe,
  validateExtension,
  formatBytes,
  getFileSize
} = require('../utils/fileManager');
const { pdfToWord } = require('../services/pdfToWord');
const { mergePdfs } = require('../services/mergePdf');
const { compressPdf } = require('../services/compressPdf');
const { wordToPdf } = require('../services/wordToPdf');
const { excelToPdf } = require('../services/excelToPdf');
const { incrementConversion } = require('../database/users');
const { mainMenuKeyboard, doneCancelKeyboard, cancelKeyboard } = require('../keyboards/mainMenu');
const { processImagesToPdf } = require('./callbackHandler');
const logger = require('../utils/logger');

async function documentHandler(ctx) {
  const doc = ctx.message?.document;
  if (!doc) return;

  const userId = ctx.from.id;
  ctx.session = ctx.session || {};
  const mode = ctx.session.mode;

  // Size check
  if (doc.file_size && doc.file_size > config.maxFileSizeBytes) {
    await ctx.reply(ctx.t('error_file_too_large', { max: config.maxFileSizeMB }));
    return;
  }

  const fileName = doc.file_name || 'file';
  const ext = path.extname(fileName).toLowerCase();

  try {
    if (mode === 'pdf_to_word') {
      if (ext !== '.pdf' && doc.mime_type !== config.supportedPdfMime) {
        await ctx.reply(ctx.t('error_invalid_format', { formats: 'PDF' }));
        return;
      }
      await handlePdfToWord(ctx, doc, fileName);
    } else if (mode === 'merge_pdf') {
      if (ext !== '.pdf' && doc.mime_type !== config.supportedPdfMime) {
        await ctx.reply(ctx.t('error_invalid_format', { formats: 'PDF' }));
        return;
      }
      await handleMergeAdd(ctx, doc, fileName);
    } else if (mode === 'compress_pdf') {
      if (ext !== '.pdf' && doc.mime_type !== config.supportedPdfMime) {
        await ctx.reply(ctx.t('error_invalid_format', { formats: 'PDF' }));
        return;
      }
      await handleCompress(ctx, doc, fileName);
    } else if (mode === 'word_to_pdf') {
      if (!validateExtension(fileName, config.supportedWordExts) &&
          !config.supportedWordMimes.includes(doc.mime_type)) {
        await ctx.reply(ctx.t('error_invalid_format', { formats: 'DOC, DOCX' }));
        return;
      }
      await handleWordToPdf(ctx, doc, fileName);
    } else if (mode === 'excel_to_pdf') {
      if (!validateExtension(fileName, config.supportedExcelExts) &&
          !config.supportedExcelMimes.includes(doc.mime_type)) {
        await ctx.reply(ctx.t('error_invalid_format', { formats: 'XLS, XLSX' }));
        return;
      }
      await handleExcelToPdf(ctx, doc, fileName);
    } else {
      // No active mode - ignore or prompt
      await ctx.reply(ctx.t('choose_service'), mainMenuKeyboard(ctx.t));
    }
  } catch (err) {
    logger.error('documentHandler error', err);
    let msg = ctx.t('error_generic');
    if (err.message && err.message.includes('LibreOffice')) {
      msg = ctx.t('error_libreoffice');
    } else if (err.message && err.message.includes('Ghostscript')) {
      msg = ctx.t('error_ghostscript');
    }
    await ctx.reply(msg);
    ctx.session.mode = null;
    await ctx.reply(ctx.t('choose_service'), mainMenuKeyboard(ctx.t));
  }
}

async function handlePdfToWord(ctx, doc, fileName) {
  const status = await ctx.reply(ctx.t('file_received'));
  const dest = createTempPath(ctx.from.id, fileName, 'pdf_');
  await downloadTelegramFile(ctx, doc.file_id, dest);

  try {
    await ctx.telegram.editMessageText(ctx.chat.id, status.message_id, null, ctx.t('converting')).catch(() => {});
    const outPath = await pdfToWord(dest, ctx.from.id);
    const outName = path.basename(fileName, path.extname(fileName)) + '.docx';

    await ctx.replyWithDocument({
      source: outPath,
      filename: outName
    });
    incrementConversion(ctx.from.id, 'pdf_to_word');
    await ctx.telegram.editMessageText(ctx.chat.id, status.message_id, null, ctx.t('success')).catch(() => {});
    deleteFileSafe(dest);
    deleteFileSafe(outPath);
  } finally {
    ctx.session.mode = null;
    await ctx.reply(ctx.t('choose_service'), mainMenuKeyboard(ctx.t));
  }
}

async function handleMergeAdd(ctx, doc, fileName) {
  const dest = createTempPath(ctx.from.id, fileName, 'merge_');
  await downloadTelegramFile(ctx, doc.file_id, dest);
  ctx.session.files = ctx.session.files || [];
  ctx.session.files.push(dest);
  await ctx.reply(
    ctx.t('merge_added', { count: ctx.session.files.length }),
    doneCancelKeyboard(ctx.t)
  );
}

async function finishMerge(ctx) {
  const files = ctx.session.files || [];
  if (files.length < 2) {
    await ctx.reply(ctx.t('merge_need_more'));
    return;
  }
  const status = await ctx.reply(ctx.t('converting'));
  try {
    const outPath = await mergePdfs(files, ctx.from.id);
    await ctx.replyWithDocument({
      source: outPath,
      filename: 'merged.pdf'
    });
    incrementConversion(ctx.from.id, 'merge_pdf');
    await ctx.telegram.editMessageText(ctx.chat.id, status.message_id, null, ctx.t('success')).catch(() => {});
    for (const f of files) deleteFileSafe(f);
    deleteFileSafe(outPath);
  } catch (err) {
    logger.error('merge finish error', err);
    await ctx.reply(ctx.t('error_generic'));
  } finally {
    ctx.session.mode = null;
    ctx.session.files = [];
    await ctx.reply(ctx.t('choose_service'), mainMenuKeyboard(ctx.t));
  }
}

async function handleCompress(ctx, doc, fileName) {
  const status = await ctx.reply(ctx.t('file_received'));
  const dest = createTempPath(ctx.from.id, fileName, 'comp_');
  await downloadTelegramFile(ctx, doc.file_id, dest);

  try {
    await ctx.telegram.editMessageText(ctx.chat.id, status.message_id, null, ctx.t('converting')).catch(() => {});
    const result = await compressPdf(dest, ctx.from.id);

    await ctx.replyWithDocument({
      source: result.outputPath,
      filename: 'compressed_' + path.basename(fileName)
    });

    if (result.improved) {
      await ctx.reply(ctx.t('compress_result', {
        old: result.oldFormatted,
        new: result.newFormatted,
        percent: result.percent
      }));
    } else {
      await ctx.reply(ctx.t('compress_no_gain'));
    }

    incrementConversion(ctx.from.id, 'compress_pdf');
    await ctx.telegram.editMessageText(ctx.chat.id, status.message_id, null, ctx.t('success')).catch(() => {});

    if (result.outputPath !== dest) deleteFileSafe(result.outputPath);
    deleteFileSafe(dest);
  } finally {
    ctx.session.mode = null;
    await ctx.reply(ctx.t('choose_service'), mainMenuKeyboard(ctx.t));
  }
}

async function handleWordToPdf(ctx, doc, fileName) {
  const status = await ctx.reply(ctx.t('file_received'));
  const dest = createTempPath(ctx.from.id, fileName, 'word_');
  await downloadTelegramFile(ctx, doc.file_id, dest);

  try {
    await ctx.telegram.editMessageText(ctx.chat.id, status.message_id, null, ctx.t('converting')).catch(() => {});
    const outPath = await wordToPdf(dest, ctx.from.id);
    const outName = path.basename(fileName, path.extname(fileName)) + '.pdf';

    await ctx.replyWithDocument({
      source: outPath,
      filename: outName
    });
    incrementConversion(ctx.from.id, 'word_to_pdf');
    await ctx.telegram.editMessageText(ctx.chat.id, status.message_id, null, ctx.t('success')).catch(() => {});
    deleteFileSafe(dest);
    deleteFileSafe(outPath);
  } finally {
    ctx.session.mode = null;
    await ctx.reply(ctx.t('choose_service'), mainMenuKeyboard(ctx.t));
  }
}

async function handleExcelToPdf(ctx, doc, fileName) {
  const status = await ctx.reply(ctx.t('file_received'));
  const dest = createTempPath(ctx.from.id, fileName, 'excel_');
  await downloadTelegramFile(ctx, doc.file_id, dest);

  try {
    await ctx.telegram.editMessageText(ctx.chat.id, status.message_id, null, ctx.t('converting')).catch(() => {});
    const outPath = await excelToPdf(dest, ctx.from.id);
    const outName = path.basename(fileName, path.extname(fileName)) + '.pdf';

    await ctx.replyWithDocument({
      source: outPath,
      filename: outName
    });
    incrementConversion(ctx.from.id, 'excel_to_pdf');
    await ctx.telegram.editMessageText(ctx.chat.id, status.message_id, null, ctx.t('success')).catch(() => {});
    deleteFileSafe(dest);
    deleteFileSafe(outPath);
  } finally {
    ctx.session.mode = null;
    await ctx.reply(ctx.t('choose_service'), mainMenuKeyboard(ctx.t));
  }
}

module.exports = {
  documentHandler,
  finishMerge
};
