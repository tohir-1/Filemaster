'use strict';

require('dotenv').config();
const { bot } = require('./src/bot');
const { initDatabase } = require('./src/database/db');
const { startCleanupJob } = require('./src/utils/cleanup');
const logger = require('./src/utils/logger');

async function main() {
  try {
    // Validate required env
    if (!process.env.BOT_TOKEN) {
      console.error('❌ BOT_TOKEN is missing in .env file');
      process.exit(1);
    }
    if (!process.env.ADMIN_ID) {
      console.error('❌ ADMIN_ID is missing in .env file');
      process.exit(1);
    }

    // Initialize database
    initDatabase();
    logger.info('Database initialized');

    // Start temp file cleanup job
    startCleanupJob();

    // Launch bot
    await bot.launch();
    logger.info('FileMaster Bot started successfully');
    console.log('✅ FileMaster Bot is running...');

    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (err) {
    logger.error('Failed to start bot', err);
    console.error('❌ Failed to start bot:', err.message);
    process.exit(1);
  }
}

main();
