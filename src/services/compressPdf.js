'use strict';

const fs = require('fs');
const path = require('path');
const { compressPdfWithGhostscript } = require('../utils/converter');
const { createTempPath, getFileSize, formatBytes } = require('../utils/fileManager');
const logger = require('../utils/logger');

/**
 * Compress PDF. Returns { outputPath, oldSize, newSize, percent, improved }
 * If compression fails or size increases, returns original with improved=false.
 */
async function compressPdf(inputPath, userId) {
  const oldSize = getFileSize(inputPath);
  const outPath = createTempPath(userId, path.basename(inputPath), 'compressed_');

  try {
    await compressPdfWithGhostscript(inputPath, outPath);
    const newSize = getFileSize(outPath);

    if (newSize > 0 && newSize < oldSize) {
      const percent = Math.round(((oldSize - newSize) / oldSize) * 100);
      return {
        outputPath: outPath,
        oldSize,
        newSize,
        percent,
        improved: true,
        oldFormatted: formatBytes(oldSize),
        newFormatted: formatBytes(newSize)
      };
    }

    // No improvement - keep original
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    return {
      outputPath: inputPath,
      oldSize,
      newSize: oldSize,
      percent: 0,
      improved: false,
      oldFormatted: formatBytes(oldSize),
      newFormatted: formatBytes(oldSize)
    };
  } catch (err) {
    logger.error('compressPdf error', err);
    // If Ghostscript missing, rethrow so handler can show proper message
    throw err;
  }
}

module.exports = { compressPdf };
