'use strict';

const path = require('path');
const fs = require('fs');
const { convertWithLibreOffice } = require('../utils/converter');
const { createTempPath, deleteFileSafe } = require('../utils/fileManager');
const logger = require('../utils/logger');

/**
 * Convert PDF to DOCX using LibreOffice.
 * Note: Scanned PDFs without text layer will produce poor results.
 * For best quality use text-based PDFs.
 */
async function pdfToWord(inputPath, userId) {
  const outDir = path.dirname(inputPath);
  try {
    const outputPath = await convertWithLibreOffice(inputPath, outDir, 'docx');
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output DOCX not created');
    }
    return outputPath;
  } catch (err) {
    logger.error('pdfToWord failed', err);
    throw err;
  }
}

module.exports = { pdfToWord };
