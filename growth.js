/* 烬井的邀请、里程碑和群排行。奖励只存在游戏内，不承诺提现或代币。 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CinderwellGrowth = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var GOAL = 8;
  var CURSOR_URL = 'https://cursor.com/';
  var CURSOR_NAME = '🔮 解锁 AI 冥想（使用 Cursor 构建本游戏）';
  var CURSOR_DESC = '本游戏《烬井》100% 由独立开发者使用 Cursor AI 编辑器在极短时间内全自动编写。点击下方链接探索这款改变游戏开发历史的 AI 神器，完成冥想即可获得「灰烬 +500」与特殊天赋「芯火·AI 强化」。';
  var SHARE_TITLE = '🔥 听说过全 AI 写的肉鸽游戏吗？';
  var SHARE_TEXT = '我正在玩《烬井》，这款没有底的硬核射击游戏竟然是 100% 用 Cursor AI 写出来的！';

  function blank() {
    return {
      id: '',
      channel: false,
      shared: false,
      friends: 0,
      premium: 0,
      squad: '',
      rankSeen: 0,
      rallyMute: 0,
      source: 'direct'
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
    g.source = parseSource(raw.source);
    return g;
  }

  var SOURCES = { twitter: 1, reddit: 1, tiktok: 1, producthunt: 1, v2ex: 1, threads: 1, direct: 1 };

  function parseSource(value) {
    var s = String(value || '').trim().toLowerCase();
    if (s === 'x') s = 'twitter';
    if (s === 'ph' || s === 'product_hunt') s = 'producthunt';
    return SOURCES[s] ? s : 'direct';
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

  function shareMessage(target) {
    var link = String(target || '');
    return SHARE_TITLE + '\n'
      + SHARE_TEXT + '\n'
      + '点击链接直接在 Telegram 里开玩：' + link + '\n'
      + '快来加入我的群组公会，一起下井打榜！';
  }

  function shareLink(target) {
    return 'https://t.me/share/url?url=' + encodeURIComponent(target) + '&text=' + encodeURIComponent(shareMessage(target));
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
    CURSOR_URL: CURSOR_URL,
    CURSOR_NAME: CURSOR_NAME,
    CURSOR_DESC: CURSOR_DESC,
    SHARE_TITLE: SHARE_TITLE,
    SHARE_TEXT: SHARE_TEXT,
    shareMessage: shareMessage,
    blank: blank,
    normalize: normalize,
    slug: slug,
    parseSource: parseSource,
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
