'use strict';

require('dotenv').config();
const path = require('path');

const config = {
  botToken: process.env.BOT_TOKEN,
  adminId: parseInt(process.env.ADMIN_ID, 10),
  botUsername: process.env.BOT_USERNAME || 'FileMasterBot',
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10),
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10) * 1024 * 1024,
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'database.sqlite'),
  tempDir: path.join(process.cwd(), 'temp'),
  logsDir: path.join(process.cwd(), 'logs'),
  supportedImageMimes: ['image/jpeg', 'image/png', 'image/webp'],
  supportedImageExts: ['.jpg', '.jpeg', '.png', '.webp'],
  supportedPdfMime: 'application/pdf',
  supportedWordMimes: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  supportedWordExts: ['.doc', '.docx'],
  supportedExcelMimes: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  supportedExcelExts: ['.xls', '.xlsx'],
  pageSizes: {
    A4: { width: 595.28, height: 841.89 },
    Letter: { width: 612, height: 792 }
  },
  // Max concurrent conversions per user
  maxParallelPerUser: 1,
  // Temp file max age in minutes
  tempFileMaxAgeMinutes: 30
};

module.exports = config;
