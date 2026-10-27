/* 平台层：在 Telegram Mini App 里跑时接上 Telegram WebApp，在浏览器里直接跑也能玩。
   只实现 main.js 用到的接口，存档放在 localStorage（Telegram 内置浏览器会保留）。 */
(function () {
  'use strict';
  var KEY = 'cinderwell-local-save';
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg && !tg.initData) tg = null;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function setupTelegram() {
    tg.ready();
    tg.expand();
    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    try {
      tg.setHeaderColor('#100e14');
      tg.setBackgroundColor('#100e14');
    } catch (e) {}
  }

  window.TGMP = {
    telegram: tg,
    on: function (el, type, fn, opts) { el.addEventListener(type, fn, opts); },
    setTimeout: function (fn, ms) { return window.setTimeout(fn, ms); },
    saveProgress: function (data) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    },
    gameOver: function (score) { console.log('[TGMP] gameOver', score); },
    reportEvent: function (name, data) { console.log('[TGMP] event', name, data); },
    createGame: function (g) {
      var boot = function () {
        if (tg) setupTelegram();
        g.initialize({ progress: load(), build: window.TGMP_BUILD });
        g.start();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else boot();
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) g.pause(); else g.resume();
      });
      if (tg) {
        tg.onEvent('deactivated', function () { g.pause(); });
        tg.onEvent('activated', function () { g.resume(); });
      }
      window.addEventListener('pagehide', function () { g.destroy(); });
    }
  };
})();
