'use strict';

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

/**
 * Run LibreOffice in headless mode to convert documents.
 * Returns the output file path.
 */
function convertWithLibreOffice(inputPath, outputDir, targetFormat = 'pdf', timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const input = path.resolve(inputPath);
    const outDir = path.resolve(outputDir);

    if (!fs.existsSync(input)) {
      return reject(new Error('Input file not found'));
    }
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // LibreOffice command - works on Windows (soffice) and Linux (libreoffice / soffice)
    const candidates = process.platform === 'win32'
      ? ['soffice', 'libreoffice']
      : ['libreoffice', 'soffice'];

    let cmd = null;
    for (const c of candidates) {
      try {
        // We just try; execFile will fail if not found
        cmd = c;
        break;
      } catch {
        // continue
      }
    }
    if (!cmd) cmd = 'soffice';

    const args = [
      '--headless',
      '--nologo',
      '--nofirststartwizard',
      '--norestore',
      '--convert-to', targetFormat,
      '--outdir', outDir,
      input
    ];

    const child = execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        logger.error('LibreOffice conversion failed', { error: error.message, stderr });
        // Common: LibreOffice not installed
        if (error.code === 'ENOENT' || (stderr && stderr.includes('not found'))) {
          return reject(new Error('LibreOffice is not installed or not in PATH. Please install LibreOffice.'));
        }
        return reject(new Error(`Conversion failed: ${error.message}`));
      }

      // Expected output name
      const base = path.basename(input, path.extname(input));
      const expected = path.join(outDir, `${base}.${targetFormat}`);

      if (fs.existsSync(expected)) {
        return resolve(expected);
      }

      // Sometimes LibreOffice uses different naming
      const files = fs.readdirSync(outDir).filter(f => f.startsWith(base) && f.endsWith(`.${targetFormat}`));
      if (files.length > 0) {
        return resolve(path.join(outDir, files[0]));
      }

      reject(new Error('LibreOffice finished but output file not found'));
    });

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('LibreOffice is not installed or not in PATH. Please install LibreOffice.'));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Compress PDF using Ghostscript if available.
 */
function compressPdfWithGhostscript(inputPath, outputPath, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const gsCmd = process.env.GHOSTSCRIPT_PATH || (process.platform === 'win32' ? 'gswin64c' : 'gs');

    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/ebook', // good balance
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${outputPath}`,
      inputPath
    ];

    execFile(gsCmd, args, { timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        if (error.code === 'ENOENT') {
          return reject(new Error('Ghostscript is not installed. PDF compression requires Ghostscript (gs).'));
        }
        logger.error('Ghostscript compress failed', { error: error.message, stderr });
        return reject(new Error(`PDF compression failed: ${error.message}`));
      }
      if (!fs.existsSync(outputPath)) {
        return reject(new Error('Ghostscript finished but output not found'));
      }
      resolve(outputPath);
    });
  });
}

module.exports = {
  convertWithLibreOffice,
  compressPdfWithGhostscript
};
