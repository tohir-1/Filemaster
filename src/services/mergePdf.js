'use strict';

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { createTempPath } = require('../utils/fileManager');
const logger = require('../utils/logger');

async function mergePdfs(pdfPaths, userId) {
  if (!pdfPaths || pdfPaths.length < 2) {
    throw new Error('At least 2 PDF files required');
  }

  const merged = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    if (!fs.existsSync(pdfPath)) continue;
    const bytes = fs.readFileSync(pdfPath);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  const pdfBytes = await merged.save();
  const outPath = createTempPath(userId, 'merged.pdf', 'merge_');
  fs.writeFileSync(outPath, pdfBytes);
  return outPath;
}

module.exports = { mergePdfs };
