/* 烬井广告：Adsgram 激励视频。在 Telegram 外或没配广告位时，用一个假广告走通流程。 */
(function () {
  'use strict';

  // 在 https://partner.adsgram.ai 创建激励广告位后，把 Block ID 填在这里。
  var BLOCK_ID = '';
  // 上线前改成 false；为 true 时 Adsgram 只放测试广告。
  var DEBUG = true;

  var controller = null;
  var busy = false;

  function inTelegram() {
    var tg = window.Telegram && window.Telegram.WebApp;
    return !!(tg && tg.initData);
  }

  function getController() {
    if (controller) return controller;
    if (!BLOCK_ID || !window.Adsgram || !inTelegram()) return null;
    try {
      controller = window.Adsgram.init({ blockId: BLOCK_ID, debug: DEBUG });
    } catch (e) {
      controller = null;
    }
    return controller;
  }

  function fakeAd() {
    return new Promise(function (resolve) {
      var box = document.createElement('div');
      box.className = 'fake-ad';
      box.innerHTML = '<p>测试广告</p><p class="fake-ad-count">3</p>' +
        '<button type="button" class="btn ghost">跳过</button>';
      document.body.appendChild(box);
      var left = 3;
      var timer = window.setInterval(function () {
        left -= 1;
        box.querySelector('.fake-ad-count').textContent = String(left);
        if (left <= 0) done(true);
      }, 1000);
      box.querySelector('button').addEventListener('click', function () { done(false); });
      function done(ok) {
        window.clearInterval(timer);
        box.remove();
        resolve(ok);
      }
    });
  }

  // 放一条激励广告。看完返回 true，跳过或出错返回 false。
  function rewarded() {
    if (busy) return Promise.resolve(false);
    busy = true;
    var ad = getController();
    var p = ad
      ? ad.show().then(function (r) { return !!(r && r.done); }, function () { return false; })
      : fakeAd();
    return p.then(function (ok) {
      busy = false;
      return ok;
    });
  }

  window.CinderwellAds = {
    rewarded: rewarded,
    live: function () { return !!getController(); }
  };
})();
