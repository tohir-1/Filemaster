'use strict';

const path = require('path');
const fs = require('fs');
const { convertWithLibreOffice } = require('../utils/converter');
const logger = require('../utils/logger');

async function wordToPdf(inputPath, userId) {
  const outDir = path.dirname(inputPath);
  try {
    const outputPath = await convertWithLibreOffice(inputPath, outDir, 'pdf');
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output PDF not created');
    }
    return outputPath;
  } catch (err) {
    logger.error('wordToPdf failed', err);
    throw err;
  }
}

module.exports = { wordToPdf };
