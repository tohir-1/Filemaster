'use strict';

const fs = require('fs');
const path = require('path');
const { getUser } = require('../database/users');

const locales = {};
const localeDir = path.join(__dirname, '../locales');

for (const file of fs.readdirSync(localeDir)) {
  if (file.endsWith('.json')) {
    const lang = file.replace('.json', '');
    locales[lang] = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'));
  }
}

function t(lang, key, params = {}) {
  const dict = locales[lang] || locales['uz'] || {};
  let text = dict[key] || locales['en']?.[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return text;
}

function languageMiddleware() {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    let lang = 'uz';
    if (userId) {
      const user = getUser(userId);
      if (user?.language) lang = user.language;
    }
    ctx.lang = lang;
    ctx.t = (key, params) => t(lang, key, params);
    return next();
  };
}

module.exports = { languageMiddleware, t, locales };
