'use strict';

const path = require('path');
const fs = require('fs');
const { convertWithLibreOffice } = require('../utils/converter');
const logger = require('../utils/logger');

async function excelToPdf(inputPath, userId) {
  const outDir = path.dirname(inputPath);
  try {
    // LibreOffice converts sheets to PDF reasonably well
    const outputPath = await convertWithLibreOffice(inputPath, outDir, 'pdf');
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output PDF not created');
    }
    return outputPath;
  } catch (err) {
    logger.error('excelToPdf failed', err);
    throw err;
  }
}

module.exports = { excelToPdf };
