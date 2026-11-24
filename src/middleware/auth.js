'use strict';

const config = require('../config/config');

function isAdmin(userId) {
  return Number(userId) === Number(config.adminId);
}

function adminOnly() {
  return async (ctx, next) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      await ctx.reply(ctx.t ? ctx.t('admin_only') : '⛔ Admin only');
      return;
    }
    return next();
  };
}

module.exports = { isAdmin, adminOnly };
