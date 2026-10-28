/* 烬井的邀请、里程碑和群排行。奖励只存在游戏内，不承诺提现或代币。 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CinderwellGrowth = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var GOAL = 8;
  var SHARE_TITLE = '🎮 [新星 TON 游戏] 诚邀您加入我们的生态探索之旅！';
  var SHARE_TEXT = '🚀 早期参与者可获得专属的游戏内积分与早期测试者徽章。点击即玩！';

  function blank() {
    return {
      id: '',
      channel: false,
      shared: false,
      friends: 0,
      premium: 0,
      squad: '',
      rankSeen: 0,
      rallyMute: 0
    };
  }

  function normalize(raw) {
    var g = blank();
    if (!raw || typeof raw !== 'object') return g;
    g.id = typeof raw.id === 'string' ? raw.id.slice(0, 24) : '';
    g.channel = !!raw.channel;
    g.shared = !!raw.shared;
    g.friends = Math.max(0, Math.min(99, raw.friends || 0));
    g.premium = Math.max(0, Math.min(99, raw.premium || 0));
    g.squad = slug(raw.squad);
    g.rankSeen = Math.max(0, raw.rankSeen || 0);
    g.rallyMute = Math.max(0, raw.rallyMute || 0);
    return g;
  }

  function slug(name) {
    var s = String(name || '').replace(/^@/, '').trim();
    if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(s)) return '';
    return s;
  }

  function points(raw) {
    var g = normalize(raw);
    return Math.min(10,
      2 +
      (g.channel ? 2 : 0) +
      (g.shared ? 2 : 0) +
      (g.friends > 0 ? 2 : 0) +
      (g.premium > 0 ? 2 : 0));
  }

  function ready(raw) {
    return points(raw) >= GOAL;
  }

  function parseStart(param) {
    var text = String(param || '').trim();
    var out = { inviter: '', squad: '' };
    if (!text) return out;
    var parts = text.split('_');
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if ((p.charAt(0) === 'u' || p.charAt(0) === 'p') && /^[up][A-Za-z0-9]{4,24}$/.test(p)) out.inviter = p;
      if (p.charAt(0) === 'g') out.squad = slug(p.slice(1));
    }
    return out;
  }

  function startParam(raw) {
    var g = normalize(raw);
    if (!g.id) return '';
    return g.id + (g.squad ? '_g' + g.squad : '');
  }

  function inviteTarget(pageUrl, bot, app, param, publicUrl) {
    var clean = String(publicUrl || '').trim();
    if (/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?\//.test(clean)) {
      var base = clean.split('#')[0].split('?')[0];
      return base + (param ? ('?ref=' + encodeURIComponent(param)) : '');
    }
    var start = param ? ('?startapp=' + encodeURIComponent(param)) : '';
    if (bot && /^[A-Za-z0-9_]{4,32}$/.test(bot)) {
      return 'https://t.me/' + bot + '/' + (app || 'app') + start;
    }
    var local = String(pageUrl || '').split('#')[0].split('?')[0];
    return local + (param ? ('?ref=' + encodeURIComponent(param)) : '');
  }

  function shareLink(target) {
    var text = SHARE_TITLE + '\n' + SHARE_TEXT;
    return 'https://t.me/share/url?url=' + encodeURIComponent(target) + '&text=' + encodeURIComponent(text);
  }

  function rallyText(mine, rival) {
    return '📣 应援号召：我们【' + (mine || '本群') + '】在全服排行榜上的名次正在受到挑战！'
      + (rival ? '隔壁【' + rival + '】就在前面。' : '')
      + '快叫你的群友一起上线打榜。';
  }

  function noteVisit(book, inviter, visitor, premium) {
    var next = {};
    var src = book && typeof book === 'object' ? book : {};
    Object.keys(src).forEach(function (k) { next[k] = (src[k] || []).slice(); });
    if (!inviter || !visitor || inviter === visitor) return { book: next, added: false };
    var list = next[inviter] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === visitor) return { book: next, added: false };
    list.push({ id: visitor, premium: !!premium });
    next[inviter] = list;
    return { book: next, added: true };
  }

  function credits(book, id) {
    var list = (book && book[id]) || [];
    var friends = list.length;
    var premium = 0;
    for (var i = 0; i < list.length; i++) if (list[i].premium) premium += 1;
    return { friends: friends, premium: premium };
  }

  function challenge(rows, mySlug, seenRank) {
    var list = (rows || []).slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    var index = -1;
    for (var i = 0; i < list.length; i++) if (list[i].slug === mySlug) index = i;
    if (index < 0) return null;
    var rank = index + 1;
    var mine = list[index];
    var above = index > 0 ? list[index - 1] : null;
    var close = above && (above.score - mine.score) <= Math.max(20, Math.round((mine.score || 0) * 0.15));
    var slipped = seenRank > 0 && rank > seenRank;
    if (!close && !slipped) return null;
    return {
      rank: rank,
      mine: mine.title || mine.slug,
      rival: above ? (above.title || above.slug) : '',
      text: rallyText(mine.title || mine.slug, above ? (above.title || above.slug) : '')
    };
  }

  return {
    GOAL: GOAL,
    SHARE_TITLE: SHARE_TITLE,
    SHARE_TEXT: SHARE_TEXT,
    blank: blank,
    normalize: normalize,
    slug: slug,
    points: points,
    ready: ready,
    parseStart: parseStart,
    startParam: startParam,
    inviteTarget: inviteTarget,
    shareLink: shareLink,
    rallyText: rallyText,
    noteVisit: noteVisit,
    credits: credits,
    challenge: challenge
  };
});
