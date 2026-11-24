'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('./logger');

function cleanOldTempFiles() {
  try {
    if (!fs.existsSync(config.tempDir)) return;

    const now = Date.now();
    const maxAge = config.tempFileMaxAgeMinutes * 60 * 1000;

    const userDirs = fs.readdirSync(config.tempDir);
    for (const userDir of userDirs) {
      if (userDir === '.gitkeep') continue;
      const fullUserDir = path.join(config.tempDir, userDir);
      if (!fs.statSync(fullUserDir).isDirectory()) continue;

      const files = fs.readdirSync(fullUserDir);
      for (const file of files) {
        const filePath = path.join(fullUserDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            logger.debug('Cleaned old temp file', { file: filePath });
          }
        } catch (e) {
          // ignore
        }
      }

      // Remove empty user dirs
      try {
        if (fs.readdirSync(fullUserDir).length === 0) {
          fs.rmdirSync(fullUserDir);
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    logger.error('Cleanup job error', err);
  }
}

function startCleanupJob() {
  // Run every 10 minutes
  setInterval(cleanOldTempFiles, 10 * 60 * 1000);
  // Run once at start
  cleanOldTempFiles();
  logger.info('Temp cleanup job started');
}

module.exports = { cleanOldTempFiles, startCleanupJob };
