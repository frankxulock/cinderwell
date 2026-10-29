/* 烬井激励广告。只接 Adsgram 的 Reward：看完才发奖，跳过、失败、没填广告位都不发。
   广告位在 index.html 的 CINDERWELL_ADS 里填，revive 和 double 各一个 Block ID。 */
(function () {
  'use strict';

  var cfg = window.CINDERWELL_ADS || {};
  var blocks = {
    revive: digits(cfg.revive || cfg.blockId),
    double: digits(cfg.double || cfg.blockId),
    interstitial: slotId(cfg.interstitial, /^int-\d+$/)
  };
  var debug = !!cfg.debug;
  var controllers = {};
  var busy = false;

  function digits(value) {
    return slotId(value, /^\d+$/);
  }

  function slotId(value, pattern) {
    var text = String(value || '').trim();
    return pattern.test(text) ? text : '';
  }

  function taskId() {
    return slotId(cfg.task, /^task-[\w-]+$/);
  }

  function controller(placement) {
    var id = blocks[placement] || '';
    if (!id || !window.Adsgram || typeof window.Adsgram.init !== 'function') return null;
    if (!controllers[id]) {
      try {
        controllers[id] = window.Adsgram.init({
          blockId: id,
          debug: debug,
          debugBannerType: String(id).indexOf('int-') === 0 ? 'FullscreenMedia' : 'RewardedVideo'
        });
      } catch (e) {
        controllers[id] = null;
      }
    }
    return controllers[id] || null;
  }

  function prepare() {
    ['revive', 'double', 'interstitial'].forEach(function (placement) {
      var ad = controller(placement);
      if (ad && typeof ad.load === 'function') {
        try { ad.load(); } catch (e) {}
      }
    });
  }

  function show(placement, allowClose) {
    placement = blocks[placement] ? placement : '';
    if (!placement) return Promise.resolve({ ok: false, reason: 'unconfigured' });
    if (busy) return Promise.resolve({ ok: false, reason: 'busy' });
    var ad = controller(placement);
    if (!ad || typeof ad.show !== 'function') return Promise.resolve({ ok: false, reason: 'missing' });
    busy = true;
    return ad.show().then(function (result) {
      busy = false;
      var finished = !!(result && result.done !== false);
      return { ok: allowClose ? true : finished, reason: finished ? 'done' : 'close' };
    }, function (result) {
      busy = false;
      var skipped = result && result.done === false && !result.error;
      return { ok: false, reason: skipped ? 'skip' : 'error' };
    });
  }

  function rewarded(placement) {
    return show(placement, false);
  }

  function interstitial() {
    return show('interstitial', true);
  }

  window.CinderwellAds = {
    prepare: prepare,
    rewarded: rewarded,
    interstitial: interstitial,
    taskId: taskId,
    configured: function (placement) { return placement === 'task' ? !!taskId() : !!blocks[placement]; },
    live: function () { return !!(blocks.revive || blocks.double); }
  };
})();
