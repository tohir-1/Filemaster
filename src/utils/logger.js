'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config/config');

if (!fs.existsSync(config.logsDir)) {
  fs.mkdirSync(config.logsDir, { recursive: true });
}

function getLogFile() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(config.logsDir, `bot-${date}.log`);
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  let line = `[${timestamp}] [${level}] ${message}`;
  if (meta) {
    if (meta instanceof Error) {
      line += ` | ${meta.message}\n${meta.stack || ''}`;
    } else {
      try {
        line += ` | ${JSON.stringify(meta)}`;
      } catch {
        line += ` | ${String(meta)}`;
      }
    }
  }
  return line;
}

function write(level, message, meta) {
  const line = formatMessage(level, message, meta);
  console.log(line);
  try {
    fs.appendFileSync(getLogFile(), line + '\n');
  } catch (e) {
    console.error('Failed to write log:', e.message);
  }
}

module.exports = {
  info: (msg, meta) => write('INFO', msg, meta),
  warn: (msg, meta) => write('WARN', msg, meta),
  error: (msg, meta) => write('ERROR', msg, meta),
  debug: (msg, meta) => write('DEBUG', msg, meta)
};
