'use strict';

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const config = require('../config/config');
const { createTempPath } = require('../utils/fileManager');
const logger = require('../utils/logger');

/**
 * Convert one or more images to a single PDF.
 * @param {string[]} imagePaths
 * @param {object} options { pageSize: 'A4'|'Letter', orientation: 'portrait'|'landscape' }
 */
async function imagesToPdf(imagePaths, options = {}) {
  const pageSizeName = options.pageSize || 'A4';
  const orientation = options.orientation || 'portrait';
  let { width, height } = config.pageSizes[pageSizeName] || config.pageSizes.A4;

  if (orientation === 'landscape') {
    [width, height] = [height, width];
  }

  const pdfDoc = await PDFDocument.create();

  for (const imgPath of imagePaths) {
    if (!fs.existsSync(imgPath)) continue;

    // Convert any image to JPEG buffer via sharp for reliability
    let jpegBuffer;
    try {
      jpegBuffer = await sharp(imgPath)
        .rotate() // auto-orient
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (e) {
      logger.warn('Sharp failed for image, trying raw', { path: imgPath, error: e.message });
      jpegBuffer = fs.readFileSync(imgPath);
    }

    let image;
    try {
      image = await pdfDoc.embedJpg(jpegBuffer);
    } catch {
      // try PNG
      const pngBuffer = await sharp(imgPath).png().toBuffer();
      image = await pdfDoc.embedPng(pngBuffer);
    }

    const imgWidth = image.width;
    const imgHeight = image.height;

    // Fit image into page while keeping aspect ratio
    const scale = Math.min(width / imgWidth, height / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;

    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outPath = createTempPath(
    options.userId || '0',
    'images.pdf',
    'img2pdf_'
  );
  fs.writeFileSync(outPath, pdfBytes);
  return outPath;
}

module.exports = { imagesToPdf };
