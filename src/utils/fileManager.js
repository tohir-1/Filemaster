'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const logger = require('./logger');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getUserTempDir(userId) {
  const dir = path.join(config.tempDir, String(userId));
  ensureDir(dir);
  return dir;
}

function safeFilename(originalName) {
  // Remove path traversal and dangerous chars
  let name = path.basename(originalName || 'file');
  name = name.replace(/[^a-zA-Z0-9._\-\u0400-\u04FF\u0600-\u06FF\u0100-\u017F]/g, '_');
  if (name.length > 180) {
    const ext = path.extname(name);
    name = name.slice(0, 180 - ext.length) + ext;
  }
  return name || 'file';
}

function createTempPath(userId, originalName, prefix = '') {
  const dir = getUserTempDir(userId);
  const safe = safeFilename(originalName);
  const unique = `${prefix}${uuidv4().slice(0, 8)}_${safe}`;
  return path.join(dir, unique);
}

async function downloadTelegramFile(bot, fileId, destPath) {
  const link = await bot.telegram.getFileLink(fileId);
  const response = await fetch(link.href);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}

function deleteFileSafe(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    logger.warn('Failed to delete file', { path: filePath, error: e.message });
  }
}

function deleteUserTempDir(userId) {
  const dir = path.join(config.tempDir, String(userId));
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (e) {
    logger.warn('Failed to clean user temp dir', { userId, error: e.message });
  }
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function validateExtension(filename, allowedExts) {
  const ext = path.extname(filename || '').toLowerCase();
  return allowedExts.includes(ext);
}

module.exports = {
  ensureDir,
  getUserTempDir,
  safeFilename,
  createTempPath,
  downloadTelegramFile,
  deleteFileSafe,
  deleteUserTempDir,
  getFileSize,
  formatBytes,
  validateExtension
};
