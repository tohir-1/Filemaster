'use strict';

const { Markup } = require('telegraf');

function mainMenuKeyboard(t) {
  return Markup.keyboard([
    [t('btn_pdf_to_word'), t('btn_image_to_pdf')],
    [t('btn_merge_pdf'), t('btn_compress_pdf')],
    [t('btn_word_to_pdf'), t('btn_excel_to_pdf')],
    [t('btn_stats'), t('btn_lang')],
    [t('btn_about'), t('btn_help')]
  ]).resize();
}

function cancelKeyboard(t) {
  return Markup.keyboard([[t('btn_cancel')]]).resize();
}

function doneCancelKeyboard(t) {
  return Markup.keyboard([
    [t('btn_done')],
    [t('btn_cancel')]
  ]).resize();
}

function pageSizeKeyboard(t) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t('btn_page_a4'), 'pagesize:A4'),
      Markup.button.callback(t('btn_page_letter'), 'pagesize:Letter')
    ],
    [Markup.button.callback(t('btn_cancel'), 'cancel_action')]
  ]);
}

function orientationKeyboard(t) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t('btn_portrait'), 'orient:portrait'),
      Markup.button.callback(t('btn_landscape'), 'orient:landscape')
    ],
    [Markup.button.callback(t('btn_cancel'), 'cancel_action')]
  ]);
}

function languageKeyboard(t) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t('lang_uz'), 'lang:uz')],
    [Markup.button.callback(t('lang_ru'), 'lang:ru')],
    [Markup.button.callback(t('lang_en'), 'lang:en')],
    [Markup.button.callback(t('btn_back'), 'back_main')]
  ]);
}

module.exports = {
  mainMenuKeyboard,
  cancelKeyboard,
  doneCancelKeyboard,
  pageSizeKeyboard,
  orientationKeyboard,
  languageKeyboard
};
