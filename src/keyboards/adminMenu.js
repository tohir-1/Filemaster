'use strict';

const { Markup } = require('telegraf');

function adminMenuKeyboard(t) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t('admin_stats'), 'admin:stats')],
    [Markup.button.callback(t('admin_users'), 'admin:users')],
    [Markup.button.callback(t('admin_broadcast'), 'admin:broadcast')],
    [Markup.button.callback(t('admin_status'), 'admin:status')],
    [Markup.button.callback(t('admin_logs'), 'admin:logs')],
    [Markup.button.callback(t('btn_back'), 'back_main')]
  ]);
}

module.exports = { adminMenuKeyboard };
