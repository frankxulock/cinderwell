/* 烬井界面：竖屏双摇杆，接到 TGMP 的暂停、存档和结算。 */
(function () {
  'use strict';

  var L = window.CinderwellLogic;
  var T = window.TGMP;
  var W = L.ROOM_W;
  var H = L.ROOM_H;

  var cv, ctx2, view = { ox: 0, oy: 0, s: 1 };
  var meta = L.newMeta();
  var run = null;
  var screen = 'menu';
  var hostPaused = false;
  var localPaused = false;
  var raf = 0;
  var last = 0;
  var keys = {};
  var pointer = { down: false, x: 0, y: 0 };
  var sticks = {
    l: { x: 0, y: 0, id: null },
    r: { x: 0, y: 0, id: null }
  };
  var flareHeld = false;
  var dashHeld = false;
  var audio = null;
  var ended = false;
  var lastGained = 0;
  var adBusy = false;
  var touchMode = false;
  var art = {};
  var fx = { t: 0, parts: [], floats: [], walk: 0, px: 0, py: 0, clear: 0, fade: 0, flash: 0, banner: 0, bannerText: '', reduced: false };
  var feel = { dt: 0.016, freeze: 0, mx: 0, my: 0, ghosts: {} };
  var G = window.CinderwellGrowth;
  var host = null;
  var growthBook = {};
  var pendingChannel = false;

  function $(id) { return document.getElementById(id); }

  function show(name) {
    screen = name;
    ['menu', 'shop', 'help', 'pause', 'revive', 'end', 'growth', 'rally'].forEach(function (n) {
      $('screen-' + n).classList.toggle('hidden', n !== name);
    });
    var playing = name === 'play';
    $('overlay').classList.toggle('hidden', playing);
    $('overlay').classList.toggle('play', false);
    $('hud').classList.toggle('hidden', !playing && name !== 'pause');
    var sticksOn = playing && (touchMode || window.matchMedia('(pointer: coarse)').matches);
    $('sticks').classList.toggle('hidden', !sticksOn);
    if (name === 'menu') {
      paintMenu();
      maybeRally();
    }
    if (name === 'shop') paintShop();
    if (name === 'growth') paintGrowth();
    if (name === 'pause') $('pause-text').textContent = pauseCopy();
    var card = $('screen-' + name);
    if (card && !card.classList.contains('hidden')) {
      card.style.animation = 'none';
      void card.offsetWidth;
      card.style.animation = '';
    }
  }

  function pauseCopy() {
    if (!run) return '这一局还在。';
    var names = (run.gear || []).map(function (id) { return L.itemName(id); });
    return L.floorName(run.floor) + ' · 灯油 ' + run.hp + '/' + run.maxHp +
      ' · 烬 ' + run.cinders + '。' + (names.length ? names.join('、') : '还没有道具') + '。';
  }

  function setText(id, text) {
    var el = $(id);
    if (!el || el.textContent === text) return;
    el.textContent = text;
  }

  function paintMenu() {
    ensureGrowth();
    $('menu-best').textContent = '最高 ' + (meta.best || 0);
    $('menu-ash').textContent = '灰烬 ' + (meta.ash || 0);
    $('btn-continue').classList.toggle('hidden', !hasRun());
    var got = G.points(meta.growth);
    var goal = milestoneGoal();
    var shown = Math.min(got, goal);
    $('menu-growth-label').textContent = '新星里程碑 ' + shown + '/' + goal + (meta.badge ? ' · 星标已领' : '');
    $('menu-growth-fill').style.width = Math.round(shown / goal * 100) + '%';
  }

  function sendInvite() {
    ensureGrowth();
    meta.growth.shared = true;
    persist();
    openShare(G.shareLink(inviteTarget()));
    if (screen === 'growth') paintGrowth();
    if (screen === 'menu') paintMenu();
  }

  function hasRun() {
    return run && run.status === 'play';
  }

  function persist() {
    T.saveProgress({
      meta: meta,
      run: run && run.status === 'play' ? L.snapshot(run) : null
    });
  }

  function ensureAudio() {
    if (audio) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio = new AC();
  }

  function blip(freq, dur, type, gain) {
    if (!audio) return;
    if (audio.state === 'suspended') audio.resume();
    var o = audio.createOscillator();
    var g = audio.createGain();
    o.type = type || 'triangle';
    o.frequency.value = freq;
    g.gain.value = gain || 0.03;
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    var stop = audio.currentTime + dur;
    g.gain.exponentialRampToValueAtTime(0.0001, stop);
    o.stop(stop);
  }

  function playEvents(events) {
    if (!events) return;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e === 'shoot') blip(520, 0.04, 'square', 0.012);
      else if (e === 'hit') blip(180, 0.05, 'sawtooth', 0.02);
      else if (e === 'hurt') blip(90, 0.12, 'square', 0.04);
      else if (e === 'pickup' || e === 'unlock') blip(660, 0.08, 'triangle', 0.03);
      else if (e === 'clear' || e === 'floor') blip(420, 0.12, 'triangle', 0.04);
      else if (e === 'flare') blip(140, 0.16, 'sawtooth', 0.04);
      else if (e === 'phase') blip(70, 0.18, 'sawtooth', 0.05);
      else if (e === 'deflect') blip(880, 0.04, 'square', 0.02);
      else if (e === 'guard') blip(240, 0.08, 'triangle', 0.03);
      else if (e === 'chain') blip(760, 0.07, 'triangle', 0.03);
      else if (e === 'win') blip(720, 0.2, 'triangle', 0.04);
      else if (e === 'crit') blip(980, 0.06, 'square', 0.03);
      else if (e === 'dash') blip(240, 0.07, 'sawtooth', 0.025);
      else if (e === 'blast' || e === 'toll') blip(110, 0.12, 'sawtooth', 0.04);
      else if (e === 'wave' || e === 'law' || e === 'split') blip(540, 0.1, 'triangle', 0.035);
      else if (e === 'kill') blip(320, 0.05, 'square', 0.02);
    }
  }

  function soakPops(pops) {
    if (!pops) return;
    for (var i = 0; i < pops.length; i++) {
      var p = pops[i];
      fx.floats.push({
        x: p.x, y: p.y, vy: -34, text: p.text, kind: p.kind,
        life: p.kind === 'crit' || p.kind === 'kill' ? 0.85 : 0.58
      });
      if (p.kind === 'crit') puff(p.x, p.y, 8, '#ff5d7a', 80, 0.28);
      else if (p.kind === 'kill') puff(p.x, p.y, 6, '#ffd089', 64, 0.26);
      else if (p.kind === 'dash') puff(p.x, p.y, 6, '#9ad7ff', 90, 0.2);
    }
    if (fx.floats.length > 28) fx.floats.splice(0, fx.floats.length - 28);
  }

  function punch(events) {
    if (!events || !run) return;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e === 'clear') { feel.freeze = Math.max(feel.freeze, 5); fx.banner = 0.95; fx.bannerText = '清了'; }
      else if (e === 'wave') { feel.freeze = Math.max(feel.freeze, 4); fx.banner = 0.95; fx.bannerText = '还有一波'; }
      else if (e === 'hurt') { feel.freeze = Math.max(feel.freeze, 3); fx.flash = 0.28; }
      else if (e === 'blast') { feel.freeze = Math.max(feel.freeze, 3); fx.flash = 0.16; fx.banner = 0.75; fx.bannerText = '灯桶炸了'; }
      else if (e === 'crit') feel.freeze = Math.max(feel.freeze, 2);
      else if (e === 'kill') feel.freeze = Math.max(feel.freeze, 2);
      else if (e === 'law') { fx.banner = 1; fx.bannerText = (run.toast || '').split('·')[0]; }
      else if (e === 'chain' && run.chain >= 3) { fx.banner = 0.8; fx.bannerText = '连 ' + run.chain; }
      else if (e === 'split') { fx.banner = 0.7; fx.bannerText = '裂开了'; }
    }
  }

  function startRun(fresh) {
    ensureAudio();
    ended = false;
    if (fresh || !hasRun()) {
      run = L.createRun((Math.random() * 0xffffffff) >>> 0 || 1, meta);
      run.toast = L.floorName(1) + ' · ' + (L.pactName(run.pact) || '第 1 层');
      run.toastT = 1.6;
    }
    localPaused = false;
    show('play');
    persist();
    T.reportEvent('game.start', { floor: run.floor });
  }

  function finish(kind) {
    if (ended) return;
    ended = true;
    var gained = L.settle(run, meta);
    lastGained = gained;
    var score = run.score || 0;
    var where = L.floorName(run.floor);
    var held = run.cinders || 0;
    T.gameOver(score);
    T.reportEvent(kind === 'win' ? 'game.win' : 'game.over', { score: score, floor: run.floor });
    run = null;
    persist();
    $('end-title').textContent = kind === 'win' ? '出井了' : '灯灭了';
    $('end-text').textContent = (kind === 'win' ? '窑主熄了，你走出' + where + '。' : '灯油烧尽，停在' + where + '。') +
      ' 得分 ' + score + '，身上还有烬 ' + held + '，带回灰烬 ' + gained + '。';
    $('end-double').classList.toggle('hidden', gained <= 0 || !adsReady('double'));
    show('end');
  }

  function adsReady(placement) {
    return !!(window.CinderwellAds && window.CinderwellAds.configured(placement));
  }

  function adNote(id, text) {
    var el = $(id);
    if (el) el.textContent = text || '';
  }

  function watchAd(btn, placement, noteId, onReward) {
    var ads = window.CinderwellAds;
    if (adBusy || !ads) return;
    if (!ads.configured(placement)) {
      adNote(noteId, '广告位还没填，看完真广告才会发奖励。');
      return;
    }
    adBusy = true;
    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = '广告播放中';
    adNote(noteId, '');
    if (audio && audio.state === 'running') audio.suspend();
    ads.rewarded(placement).then(function (result) {
      adBusy = false;
      btn.disabled = false;
      btn.textContent = label;
      if (audio && audio.state === 'suspended') audio.resume();
      if (result && result.ok) onReward();
      else if (result && result.reason === 'skip') adNote(noteId, '没看完，这次没有奖励。');
      else adNote(noteId, '广告没播成，这次没有奖励。');
    });
  }

  function setupTelegram() {
    var tg = window.Telegram && window.Telegram.WebApp;
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
      tg.setHeaderColor('#100e14');
      tg.setBackgroundColor('#100e14');
    } catch (e) {}
    if (window.CinderwellAds && window.CinderwellAds.prepare) window.CinderwellAds.prepare();
  }

  function clampVec(x, y) {
    var m = Math.hypot(x, y);
    if (m > 1) return { x: x / m, y: y / m };
    return { x: x, y: y };
  }

  function approach(cur, target, dt, rate) {
    if (fx.reduced) return target;
    var k = 1 - Math.exp(-rate * Math.max(0.001, dt));
    return cur + (target - cur) * k;
  }

  function readInput() {
    var mx = 0;
    var my = 0;
    var ax = 0;
    var ay = 0;
    if (Math.hypot(sticks.l.x, sticks.l.y) > 0.12) {
      mx = sticks.l.x;
      my = sticks.l.y;
    } else {
      if (keys.KeyA) mx -= 1;
      if (keys.KeyD) mx += 1;
      if (keys.KeyW) my -= 1;
      if (keys.KeyS) my += 1;
    }
    if (Math.hypot(sticks.r.x, sticks.r.y) > 0.18) {
      ax = sticks.r.x; ay = sticks.r.y;
    } else if (keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown) {
      if (keys.ArrowLeft) ax -= 1;
      if (keys.ArrowRight) ax += 1;
      if (keys.ArrowUp) ay -= 1;
      if (keys.ArrowDown) ay += 1;
    } else if (pointer.down) {
      var world = screenToWorld(pointer.x, pointer.y);
      ax = world.x - run.px;
      ay = world.y - run.py;
    }
    return { mx: mx, my: my, ax: ax, ay: ay, flare: flareHeld || !!keys.Space || !!keys.KeyJ, dash: dashHeld || !!keys.ShiftLeft || !!keys.ShiftRight || !!keys.KeyK };
  }

  function smoothMove(raw, dt) {
    var move = clampVec(raw.mx || 0, raw.my || 0);
    var stop = Math.hypot(move.x, move.y) < 0.04;
    feel.mx = approach(feel.mx, stop ? 0 : move.x, dt, stop ? 26 : 16);
    feel.my = approach(feel.my, stop ? 0 : move.y, dt, stop ? 26 : 16);
    if (Math.hypot(feel.mx, feel.my) < 0.04) {
      feel.mx = 0;
      feel.my = 0;
    }
    raw.mx = feel.mx;
    raw.my = feel.my;
    return raw;
  }

  function track(id, x, y) {
    var g = feel.ghosts[id];
    if (!g) g = feel.ghosts[id] = { x: x, y: y };
    else {
      g.x = approach(g.x, x, feel.dt, 18);
      g.y = approach(g.y, y, feel.dt, 18);
    }
    return g;
  }

  function syncVisuals() {
    if (!run) return;
    track('player', run.px, run.py);
    var room = run.rooms[run.roomId];
    var alive = {};
    if (room) {
      for (var i = 0; i < room.enemies.length; i++) {
        alive[room.enemies[i].id] = 1;
        track('e' + room.enemies[i].id, room.enemies[i].x, room.enemies[i].y);
      }
    }
    Object.keys(feel.ghosts).forEach(function (key) {
      if (key !== 'player' && !alive[key.slice(1)]) delete feel.ghosts[key];
    });
  }

  function shown(id, x, y) {
    return feel.ghosts[id] || { x: x, y: y };
  }

  function screenToWorld(cx, cy) {
    var rect = cv.getBoundingClientRect();
    var x = (cx - rect.left) * (cv.width / rect.width);
    var y = (cy - rect.top) * (cv.height / rect.height);
    return { x: (x - view.ox) / view.s, y: (y - view.oy) / view.s };
  }

  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var rect = cv.getBoundingClientRect();
    cv.width = Math.max(2, Math.floor(rect.width * dpr));
    cv.height = Math.max(2, Math.floor(rect.height * dpr));
  }

  function fit() {
    var padT = screen === 'play' ? 78 : 24;
    var padB = (screen === 'play' && !$('sticks').classList.contains('hidden')) ? 150 : 24;
    var aw = cv.width;
    var ah = cv.height - (padT + padB) * (cv.width / Math.max(1, cv.getBoundingClientRect().width));
    var s = Math.min(aw / W, Math.max(1, ah) / H);
    view.s = s;
    view.ox = (cv.width - W * s) / 2;
    view.oy = padT * (cv.width / Math.max(1, cv.getBoundingClientRect().width)) + Math.max(0, (ah - H * s) / 2);
  }

  function loop(now) {
    raf = window.requestAnimationFrame(loop);
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (dt > 0.1) dt = 0.016;
    feel.dt = dt;
    var paused = hostPaused || localPaused || screen !== 'play';
    stepFx(dt);
    if (feel.freeze > 0 && !paused && run && run.status === 'play') feel.freeze -= 1;
    else if (!paused && run && run.status === 'play') {
      var roomBefore = run.roomId;
      var before = run.rooms[roomBefore].enemies.map(function (e) {
        return { id: e.id, x: e.x, y: e.y, kind: e.kind };
      });
      L.step(run, smoothMove(readInput(), dt), dt);
      playEvents(run.events);
      soakPops(run.pops);
      punch(run.events);
      if (run.roomId !== roomBefore) {
        feel.ghosts = {};
        fx.fade = 0.26;
      }
      noteAction(before, roomBefore);
      if (run.status === 'win') finish('win');
      else if (run.status === 'dead') {
        if (run.revived || !adsReady('revive')) finish('dead');
        else if (screen !== 'revive') {
          T.reportEvent('ad.offer', { kind: 'revive', floor: run.floor });
          adNote('revive-note', '');
          show('revive');
        }
      }
    }
    syncVisuals();
    paint();
    if (run && screen === 'play') paintHud();
  }

  function paintHud() {
    setText('floor-label', L.floorName(run.floor) + ' · 第 ' + run.floor + ' 层');
    setText('score', String(run.score));
    setText('res', '烬 ' + run.cinders + '   火印 ' + run.seals + '   焰弹 ' + run.flares);
    setText('gear', L.itemName(run.weapon || 'spark') + ((run.gear && run.gear.length) ? ' · ' + run.gear.map(function (id) { return L.itemName(id); }).join(' · ') : ''));
    var room = run.rooms[run.roomId];
    var law = room && room.law ? L.lawName(room.law) : '';
    var pact = L.pactName(run.pact);
    var chain = run.chain >= 2 ? '连 ' + run.chain : '';
    setText('law', [pact, law, chain].filter(Boolean).join('  ·  '));
    $('oils').classList.toggle('low', run.hp > 0 && run.hp <= 1);
    var dashBtn = $('dash-btn');
    if (dashBtn) dashBtn.style.opacity = (run.dashCd || 0) > 0.05 ? '0.4' : '1';
    var oils = '';
    for (var i = 0; i < run.maxHp; i++) oils += '<i class="oil' + (i < run.hp ? ' on' : '') + '"></i>';
    if ($('oils').dataset.n !== oils) {
      $('oils').innerHTML = oils;
      $('oils').dataset.n = oils;
    }
    var toast = $('toast');
    if (run.toastT > 0 && run.toast) {
      if (toast.dataset.v !== run.toast) {
        toast.dataset.v = run.toast;
        toast.textContent = run.toast;
        toast.classList.remove('hidden');
        toast.style.animation = 'none';
        void toast.offsetWidth;
        toast.style.animation = '';
      }
    } else toast.classList.add('hidden');
  }

  function paint() {
    fit();
    ctx2.setTransform(1, 0, 0, 1, 0, 0);
    ctx2.clearRect(0, 0, cv.width, cv.height);
    var g = ctx2.createLinearGradient(0, 0, 0, cv.height);
    g.addColorStop(0, '#1a1422');
    g.addColorStop(1, '#0d0b10');
    ctx2.fillStyle = g;
    ctx2.fillRect(0, 0, cv.width, cv.height);
    if (!run || screen === 'menu' || screen === 'shop' || screen === 'help') {
      drawTitle();
      return;
    }
    ctx2.setTransform(view.s, 0, 0, view.s, view.ox, view.oy);
    var shake = 0;
    if (run.shake > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shake = Math.sin(run.time * 60) * 1.5 * run.shake;
      ctx2.translate(shake, 0);
    }
    drawRoom(L && run.rooms[run.roomId]);
  }

  function stepFx(dt) {
    fx.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fx.fade > 0) fx.fade -= dt;
    if (fx.flash > 0) fx.flash -= dt;
    if (fx.banner > 0) fx.banner -= dt;
    for (var n = fx.floats.length - 1; n >= 0; n--) {
      var f = fx.floats[n];
      f.life -= dt;
      f.y += f.vy * dt;
      if (f.life <= 0) fx.floats.splice(n, 1);
    }
    if (fx.reduced) {
      fx.parts.length = 0;
      return;
    }
    fx.t += dt;
    if (fx.clear > 0) fx.clear -= dt;
    for (var i = fx.parts.length - 1; i >= 0; i--) {
      var p = fx.parts[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 18 * dt;
      if (p.life <= 0) fx.parts.splice(i, 1);
    }
  }

  function puff(x, y, n, color, speed, life) {
    if (fx.reduced) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = speed * (0.35 + Math.random() * 0.65);
      fx.parts.push({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.2,
        life: life * (0.65 + Math.random() * 0.5),
        max: life,
        r: 1.2 + Math.random() * 1.6,
        color: color
      });
    }
    if (fx.parts.length > 80) fx.parts.splice(0, fx.parts.length - 80);
  }

  function noteAction(before, roomBefore) {
    if (!run) return;
    var moved = Math.hypot(run.px - fx.px, run.py - fx.py);
    fx.moving = moved > 0.4;
    if (fx.moving) {
      fx.walk += moved;
      if (fx.walk > 16) {
        fx.walk = 0;
        puff(run.px, run.py + 10, 1, 'rgba(214, 184, 140, 0.85)', 16, 0.2);
      }
    }
    fx.px = run.px;
    fx.py = run.py;
    if (run.roomId !== roomBefore) puff(run.px, run.py, 8, '#ffd089', 46, 0.28);
    else {
      var alive = {};
      var list = run.rooms[run.roomId].enemies;
      var i;
      for (i = 0; i < list.length; i++) alive[list[i].id] = 1;
      for (i = 0; i < before.length; i++) {
        if (!alive[before[i].id]) {
          puff(before[i].x, before[i].y, (before[i].kind === 'warden' || before[i].kind === 'smith' || before[i].kind === 'queen' || before[i].kind === 'king') ? 18 : 9, '#ffb15a', 84, 0.42);
        }
      }
    }
    var ev = run.events || [];
    for (i = 0; i < ev.length; i++) {
      if (ev[i] === 'shoot') puff(run.px + run.fx * 16, run.py + run.fy * 16, 3, '#ffe08a', 55, 0.16);
      else if (ev[i] === 'flare') puff(run.px, run.py, 20, '#ff7a3c', 130, 0.4);
      else if (ev[i] === 'pickup' || ev[i] === 'unlock') puff(run.px, run.py - 8, 7, '#ffd089', 40, 0.32);
      else if (ev[i] === 'clear') fx.clear = 0.55;
      else if (ev[i] === 'hurt') puff(run.px, run.py, 7, '#ff5d7a', 60, 0.26);
      else if (ev[i] === 'phase') puff(run.px, run.py, 16, '#e36a5d', 110, 0.45);
      else if (ev[i] === 'deflect') puff(run.px + run.fx * 18, run.py + run.fy * 18, 5, '#9ad7ff', 70, 0.22);
      else if (ev[i] === 'guard') puff(run.px, run.py, 8, '#b7e3ff', 50, 0.28);
      else if (ev[i] === 'chain') puff(run.px, run.py - 12, 6, '#ffd089', 48, 0.3);
      else if (ev[i] === 'dash') puff(run.px - run.fx * 18, run.py - run.fy * 18, 7, '#d7ecff', 70, 0.22);
      else if (ev[i] === 'blast') puff(run.px, run.py, 14, '#ff7a3c', 120, 0.36);
      else if (ev[i] === 'toll') puff(run.px, run.py, 4, '#c9b6ff', 40, 0.2);
    }
  }

  function drawParts() {
    for (var i = 0; i < fx.parts.length; i++) {
      var p = fx.parts[i];
      ctx2.globalAlpha = Math.max(0, p.life / p.max);
      ctx2.fillStyle = p.color;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx2.fill();
    }
    ctx2.globalAlpha = 1;
  }

  function loadArt() {
    var files = {
      player: 'art/player.jpg',
      mote: 'art/mote.jpg',
      spit: 'art/spit.jpg',
      husk: 'art/husk.jpg',
      warden: 'art/warden.jpg',
      floor: 'art/floor.jpg',
      props: 'art/props.jpg'
    };
    Object.keys(files).forEach(function (key) {
      var img = new Image();
      img.onload = function () {
        if (key === 'floor') art.floor = img;
        else if (key === 'props') sliceProps(knockOut(img));
        else art[key] = knockOut(img);
      };
      img.src = files[key];
    });
  }

  function knockOut(img) {
    var c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    var image = g.getImageData(0, 0, c.width, c.height);
    var d = image.data;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i];
      var gc = d[i + 1];
      var b = d[i + 2];
      var spill = gc - Math.max(r, b);
      if (spill > 28 && gc > r + 40 && gc > b + 40) {
        var alpha = spill > 90 ? 0 : Math.max(0, 1 - (spill - 28) / 62);
        d[i + 3] = Math.round(d[i + 3] * alpha);
        var cap = Math.max(r, b);
        d[i + 1] = Math.min(gc, cap + 8);
      }
    }
    g.putImageData(image, 0, 0);
    return c;
  }

  function trimCanvas(src) {
    var g = src.getContext('2d');
    var w = src.width;
    var h = src.height;
    var data = g.getImageData(0, 0, w, h).data;
    var minX = w;
    var minY = h;
    var maxX = 0;
    var maxY = 0;
    var found = false;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 24) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return src;
    var tw = maxX - minX + 1;
    var th = maxY - minY + 1;
    var out = document.createElement('canvas');
    out.width = tw;
    out.height = th;
    out.getContext('2d').drawImage(src, minX, minY, tw, th, 0, 0, tw, th);
    return out;
  }

  function sliceProps(sheet) {
    var names = ['cinder', 'seal', 'vial', 'flare', 'stairs', 'relic'];
    var col = sheet.width / names.length;
    for (var i = 0; i < names.length; i++) {
      var c = document.createElement('canvas');
      c.width = Math.floor(col);
      c.height = sheet.height;
      c.getContext('2d').drawImage(sheet, Math.floor(i * col), 0, c.width, sheet.height, 0, 0, c.width, sheet.height);
      art[names[i]] = trimCanvas(c);
    }
  }

  function drawSprite(img, x, y, height) {
    if (!img) return false;
    var aspect = img.width / img.height;
    var h = height;
    var w = h * aspect;
    ctx2.drawImage(img, x - w / 2, y - h / 2, w, h);
    return true;
  }

  function drawTitle() {
    ctx2.save();
    ctx2.translate(cv.width / 2, cv.height * 0.58);
    var s = Math.min(cv.width, cv.height) / 420;
    ctx2.scale(s, s);
    ctx2.fillStyle = '#241c2c';
    roundRect(-120, -30, 240, 250, 28);
    ctx2.fill();
    ctx2.strokeStyle = '#6a5344';
    ctx2.lineWidth = 6;
    ctx2.stroke();
    ctx2.fillStyle = '#3a2a22';
    ctx2.beginPath();
    ctx2.ellipse(0, 200, 70, 18, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = '#e7a04a';
    ctx2.beginPath();
    ctx2.arc(0, 40, 18, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = '#ffd089';
    ctx2.beginPath();
    ctx2.arc(0, 18, 10, 0, Math.PI * 2);
    ctx2.fill();
    if (art.player) {
      var bob = fx.reduced ? 0 : Math.sin(fx.t * 2.2) * 7;
      drawSprite(art.player, 8, 70 + bob, 156);
      ctx2.globalAlpha = 0.28 + Math.sin(fx.t * 9) * 0.12;
      ctx2.fillStyle = '#ffb15a';
      ctx2.beginPath();
      ctx2.arc(-20, 98 + bob, 18 + Math.sin(fx.t * 11) * 4, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.globalAlpha = 1;
    }
    if (!fx.reduced) {
      ctx2.fillStyle = '#ffd089';
      for (var i = 0; i < 7; i++) {
        var y = 180 - ((fx.t * 22 + i * 36) % 200);
        ctx2.globalAlpha = 0.35 + (i % 3) * 0.15;
        ctx2.fillRect(-100 + i * 28, y, 2, 2);
      }
      ctx2.globalAlpha = 1;
    }
    ctx2.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx2.beginPath();
    ctx2.moveTo(x + r, y);
    ctx2.arcTo(x + w, y, x + w, y + h, r);
    ctx2.arcTo(x + w, y + h, x, y + h, r);
    ctx2.arcTo(x, y + h, x, y, r);
    ctx2.arcTo(x, y, x + w, y, r);
    ctx2.closePath();
  }

  function drawRoom(room) {
    ctx2.fillStyle = '#14111a';
    ctx2.fillRect(0, 0, W, H);
    if (art.floor) {
      ctx2.drawImage(art.floor, L.WALL, L.WALL, W - L.WALL * 2, H - L.WALL * 2);
      if (room.kind === 'shop' || room.kind === 'shrine' || room.kind === 'trial' || room.kind === 'gift' || room.kind === 'talent' || room.kind === 'wager' || room.kind === 'tide') {
        ctx2.fillStyle = room.kind === 'shop' ? 'rgba(90, 60, 18, 0.22)' : room.kind === 'trial' || room.kind === 'tide' ? 'rgba(78, 48, 120, 0.28)' : room.kind === 'gift' ? 'rgba(70, 110, 48, 0.22)' : room.kind === 'wager' ? 'rgba(90, 40, 90, 0.24)' : room.kind === 'talent' ? 'rgba(40, 80, 110, 0.24)' : 'rgba(40, 70, 48, 0.18)';
        ctx2.fillRect(L.WALL, L.WALL, W - L.WALL * 2, H - L.WALL * 2);
      }
      if ((run.floor - 1) % 3 === 1) {
        ctx2.fillStyle = 'rgba(36, 64, 82, 0.16)';
        ctx2.fillRect(L.WALL, L.WALL, W - L.WALL * 2, H - L.WALL * 2);
      } else if ((run.floor - 1) % 3 === 2) {
        ctx2.fillStyle = 'rgba(92, 28, 18, 0.16)';
        ctx2.fillRect(L.WALL, L.WALL, W - L.WALL * 2, H - L.WALL * 2);
      }
      var wash = { nest: 'rgba(120, 70, 180, 0.16)', glass: 'rgba(80, 170, 190, 0.14)', vein: 'rgba(180, 120, 40, 0.16)', duel: 'rgba(160, 40, 40, 0.16)', wave: 'rgba(50, 80, 160, 0.16)' };
      if (wash[room.law]) {
        ctx2.fillStyle = wash[room.law];
        ctx2.fillRect(L.WALL, L.WALL, W - L.WALL * 2, H - L.WALL * 2);
      }
    } else {
      ctx2.fillStyle = room.kind === 'shop' ? '#241e16' : room.kind === 'trial' || room.kind === 'tide' ? '#22182c' : room.kind === 'gift' ? '#1c2418' : room.kind === 'wager' ? '#241824' : room.kind === 'talent' ? '#182028' : '#1a1722';
      ctx2.fillRect(L.WALL, L.WALL, W - L.WALL * 2, H - L.WALL * 2);
    }
    ctx2.fillStyle = '#2a2436';
    ctx2.fillRect(0, 0, W, L.WALL);
    ctx2.fillRect(0, H - L.WALL, W, L.WALL);
    ctx2.fillRect(0, 0, L.WALL, H);
    ctx2.fillRect(W - L.WALL, 0, L.WALL, H);
    drawDoors(room);
    drawHazards(room);
    drawBarrels(room);
    for (var i = 0; i < room.pickups.length; i++) drawPickup(room.pickups[i]);
    for (i = 0; i < room.enemies.length; i++) drawEnemy(room.enemies[i]);
    for (i = 0; i < run.bolts.length; i++) drawBolt(run.bolts[i]);
    if (run.orbit > 0) {
      ctx2.fillStyle = '#ffd089';
      ctx2.beginPath();
      ctx2.arc(run.orbitX || run.px, run.orbitY || run.py, 5, 0, Math.PI * 2);
      ctx2.fill();
    }
    drawParts();
    ctx2.save();
    ctx2.globalCompositeOperation = 'lighter';
    var spot = shown('player', run.px, run.py);
    var pulse = 68 + Math.sin(fx.t * 8) * 10;
    var light = ctx2.createRadialGradient(spot.x, spot.y - 6, 2, spot.x, spot.y, pulse);
    light.addColorStop(0, 'rgba(255, 190, 96, 0.5)');
    light.addColorStop(1, 'rgba(255, 140, 40, 0)');
    ctx2.fillStyle = light;
    ctx2.beginPath();
    ctx2.arc(spot.x, spot.y, pulse, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.restore();
    drawPlayer();
    var shade = ctx2.createRadialGradient(spot.x, spot.y, 36, spot.x, spot.y, 260);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(6, 4, 10, 0.5)');
    ctx2.fillStyle = shade;
    ctx2.fillRect(0, 0, W, H);
    if (fx.clear > 0) {
      var k = fx.clear / 0.55;
      ctx2.strokeStyle = 'rgba(255, 214, 150, ' + k + ')';
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.arc(W / 2, H / 2, 24 + (1 - k) * 190, 0, Math.PI * 2);
      ctx2.stroke();
    }
    if (run.grace > 0) {
      ctx2.fillStyle = 'rgba(8, 6, 12, ' + Math.min(0.5, run.grace * 1.5) + ')';
      ctx2.fillRect(0, 0, W, H);
    }
    if (run.iframes > 0.2) {
      ctx2.strokeStyle = 'rgba(168, 36, 44, ' + Math.min(0.75, run.iframes) + ')';
      ctx2.lineWidth = 16;
      ctx2.strokeRect(8, 8, W - 16, H - 16);
    }
    drawMap();
    drawCaption(room);
    drawFloats();
    if (fx.banner > 0 && fx.bannerText) {
      ctx2.globalAlpha = Math.min(1, fx.banner * 1.6);
      ctx2.fillStyle = '#ffd089';
      ctx2.font = 'bold 26px sans-serif';
      ctx2.textAlign = 'center';
      ctx2.fillText(fx.bannerText, W / 2, H / 2 - 78);
      ctx2.globalAlpha = 1;
    }
    if (fx.flash > 0) {
      ctx2.fillStyle = 'rgba(255, 70, 80, ' + Math.min(0.35, fx.flash) + ')';
      ctx2.fillRect(0, 0, W, H);
    }
    if (fx.fade > 0) {
      ctx2.fillStyle = 'rgba(8, 6, 12, ' + Math.min(0.72, fx.fade / 0.26) + ')';
      ctx2.fillRect(0, 0, W, H);
    }
  }

  function drawBarrels(room) {
    var list = room.barrels || [];
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || b.hp <= 0) continue;
      ctx2.fillStyle = '#6a3a22';
      ctx2.beginPath();
      ctx2.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.strokeStyle = '#ffb15a';
      ctx2.lineWidth = 2;
      ctx2.stroke();
      ctx2.fillStyle = '#ffd089';
      ctx2.font = '11px sans-serif';
      ctx2.textAlign = 'center';
      ctx2.fillText('灯桶', b.x, b.y + 4);
    }
  }

  function drawFloats() {
    ctx2.textAlign = 'center';
    for (var i = 0; i < fx.floats.length; i++) {
      var f = fx.floats[i];
      ctx2.globalAlpha = Math.max(0, f.life / 0.7);
      ctx2.fillStyle = f.kind === 'crit' ? '#ff5d7a' : f.kind === 'heal' ? '#9dffb0' : f.kind === 'dash' ? '#d7ecff' : '#fff4d2';
      ctx2.font = (f.kind === 'crit' || f.kind === 'kill' ? 'bold 18px' : 'bold 14px') + ' sans-serif';
      ctx2.fillText(f.text, f.x, f.y);
    }
    ctx2.globalAlpha = 1;
  }

  function drawHazards(room) {
    var list = room.hazards || [];
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      var pulse = 0.45 + Math.sin(fx.t * 5 + i) * 0.2;
      ctx2.fillStyle = 'rgba(40, 16, 12, 0.85)';
      ctx2.beginPath();
      ctx2.ellipse(h.x, h.y, h.r, h.r * 0.62, 0, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.strokeStyle = 'rgba(255, 120, 60, ' + pulse + ')';
      ctx2.lineWidth = 2;
      ctx2.stroke();
      ctx2.fillStyle = 'rgba(255, 150, 70, ' + (0.25 + pulse * 0.3) + ')';
      ctx2.beginPath();
      ctx2.ellipse(h.x, h.y, h.r * 0.35, h.r * 0.2, 0, 0, Math.PI * 2);
      ctx2.fill();
    }
  }

  function drawCaption(room) {
    var text = '';
    if (room.kind === 'start') text = '灯台';
    else if (room.kind === 'shrine') text = '灯龛 · 两件里选一件';
    else if (room.kind === 'trial') text = room.cleared ? '试炼清了' : '试炼 · 清完有奖';
    else if (room.kind === 'shop') text = '货摊 · 用烬换';
    else if (room.kind === 'cache') text = room.unlocked ? '库房' : '库房 · 要火印';
    else if (room.kind === 'boss') text = room.cleared ? (L.bossName(room.bossKind) + '熄了') : '';
    else if (room.kind === 'combat') text = room.cleared ? '' : (L.lawName(room.law) || '战斗');
    else if (room.kind === 'tide') text = room.cleared ? '潮退了' : '怪物潮 · 还会再来';
    else if (room.kind === 'gift') text = '福利 · 拿东西，武器选一把';
    else if (room.kind === 'talent') text = '天赋 · 选一个';
    else if (room.kind === 'wager') text = '赌桌 · 踩上去碰运气';
    ctx2.fillStyle = 'rgba(244,234,215,0.86)';
    ctx2.font = '14px sans-serif';
    ctx2.textAlign = 'center';
    if (text) ctx2.fillText(text, W / 2, 46);
    if (room.kind === 'start' && run.time < 6) {
      ctx2.fillStyle = 'rgba(244,234,215,0.72)';
      ctx2.font = '13px sans-serif';
      ctx2.fillText('WASD 走，鼠标瞄准。Shift 冲刺，空格焰弹。', W / 2, H - 42);
    }
  }

  function doorOpen(room, dir) {
    return L.passageOpen(run, room, dir);
  }

  function drawDoors(room) {
    var doors = [
      ['n', W / 2 - 32, 0, 64, L.WALL],
      ['s', W / 2 - 32, H - L.WALL, 64, L.WALL],
      ['w', 0, H / 2 - 32, L.WALL, 64],
      ['e', W - L.WALL, H / 2 - 32, L.WALL, 64]
    ];
    for (var i = 0; i < doors.length; i++) {
      var d = doors[i];
      if (room.links[d[0]] == null) continue;
      var dest = run.rooms[room.links[d[0]]];
      var open = doorOpen(room, d[0]);
      var glow = 0.14 + Math.sin(fx.t * 3 + i) * 0.05;
      ctx2.fillStyle = open ? '#100c14' : (dest.kind === 'cache' && !dest.unlocked ? '#6a4a28' : '#241c2e');
      ctx2.fillRect(d[1], d[2], d[3], d[4]);
      if (open) {
        ctx2.fillStyle = 'rgba(255, 176, 80, ' + glow + ')';
        ctx2.fillRect(d[1], d[2], d[3], d[4]);
      } else {
        ctx2.strokeStyle = 'rgba(180, 150, 120, ' + (0.45 + Math.sin(fx.t * 2 + i) * 0.15) + ')';
        ctx2.lineWidth = 2;
        ctx2.strokeRect(d[1] + 6, d[2] + 4, d[3] - 12, d[4] - 8);
      }
    }
  }

  function drawPickup(p) {
    var key = p.kind === 'item' ? 'relic' : p.kind;
    var bob = fx.reduced ? 0 : Math.sin(fx.t * 3 + p.x * 0.08) * 3.2;
    var size = (p.r || 10) * 2.8;
    ctx2.save();
    ctx2.translate(p.x, p.y + bob);
    ctx2.fillStyle = 'rgba(0,0,0,0.3)';
    ctx2.beginPath();
    ctx2.ellipse(0, size * 0.42, size * 0.28, 3.5, 0, 0, Math.PI * 2);
    ctx2.fill();
    var painted = drawSprite(art[key], 0, 0, size);
    if (!painted) {
      ctx2.fillStyle = p.kind === 'weapon' ? '#9ad7ff' : p.kind === 'item' ? '#9dffc8' : '#e7a04a';
      ctx2.beginPath();
      ctx2.arc(0, 0, p.r || 8, 0, Math.PI * 2);
      ctx2.fill();
    }
    ctx2.restore();
    var line = p.y + bob + size * 0.55 + 8;
    ctx2.font = '11px sans-serif';
    ctx2.textAlign = 'center';
    if (p.kind === 'item' || p.kind === 'talent' || p.kind === 'weapon') {
      var label = p.kind === 'talent' ? p.talent : p.kind === 'weapon' ? p.weapon : p.item;
      ctx2.fillStyle = '#f4ead7';
      ctx2.fillText(L.itemName(label), p.x, line);
      ctx2.fillStyle = '#b3a89a';
      ctx2.fillText(L.itemDesc(label), p.x, line + 13);
      line += 26;
    }
    if (p.kind === 'wager') {
      ctx2.fillStyle = '#e7b0e4';
      ctx2.fillText('赌一把', p.x, line);
    }
    if (p.price) {
      ctx2.fillStyle = '#ffd089';
      ctx2.fillText((p.sale ? '特价 ' : '') + p.price + ' 烬', p.x, line);
    }
  }

  function drawEnemy(e) {
    var bob = fx.reduced ? 0 : Math.sin(fx.t * (e.kind === 'mote' ? 4.6 : 2.3) + e.id * 1.7) * (e.kind === 'mote' ? 3.6 : 1.3);
    var wind = ((e.kind === 'spit' || e.kind === 'warden' || e.kind === 'smith') && e.cd > 0 && e.cd < 0.4) || ((e.kind === 'ash' || e.kind === 'king') && e.wind > 0);
    var sc = wind ? 1 + (0.4 - e.cd) * 0.65 : 1;
    var vis = shown('e' + e.id, e.x, e.y);
    ctx2.save();
    ctx2.translate(vis.x, vis.y);
    ctx2.fillStyle = 'rgba(0,0,0,0.28)';
    ctx2.beginPath();
    ctx2.ellipse(0, e.r * 0.9, e.r * 0.95, e.r * 0.28, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.translate(0, bob);
    if ((e.kind === 'ash' || e.kind === 'king') && e.dash > 0) {
      ctx2.rotate(Math.atan2(e.dy || 1, e.dx || 0));
      ctx2.scale(1.35, 0.72);
    }
    ctx2.scale(sc, 2 - sc);
    var height = e.r * ((e.kind === 'warden' || e.kind === 'smith' || e.kind === 'queen' || e.kind === 'king') ? 2.7 : 3.1);
    if (e.kind === 'ash') {
      ctx2.fillStyle = '#d9c7aa';
      ctx2.beginPath();
      ctx2.moveTo(0, -e.r);
      ctx2.lineTo(e.r * 0.85, e.r * 0.15);
      ctx2.lineTo(0, e.r);
      ctx2.lineTo(-e.r * 0.85, e.r * 0.15);
      ctx2.closePath();
      ctx2.fill();
      ctx2.fillStyle = '#e36a3a';
      ctx2.fillRect(-2, -e.r * 0.15, 4, e.r * 0.7);
    } else if (!drawSprite(art[e.kind], 0, 0, height)) {
      var col = e.kind === 'warden' || e.kind === 'king' ? '#e36a5d' : e.kind === 'smith' ? '#d7c4ff' : e.kind === 'queen' ? '#e7c56a' : e.kind === 'spit' ? '#3dcec4' : e.kind === 'husk' ? '#c46b4a' : e.kind === 'moth' ? '#e7c56a' : e.kind === 'bell' ? '#b9a6ff' : e.kind === 'ash' ? '#d9c7aa' : '#8b6cff';
      ctx2.fillStyle = col;
      if (e.kind === 'smith') {
        ctx2.beginPath();
        ctx2.moveTo(-e.r, e.r * 0.2);
        ctx2.quadraticCurveTo(0, -e.r * 1.35, e.r, e.r * 0.2);
        ctx2.lineTo(e.r * 0.7, e.r);
        ctx2.lineTo(-e.r * 0.7, e.r);
        ctx2.closePath();
        ctx2.fill();
        ctx2.fillRect(e.r * 0.15, -e.r * 0.2, e.r * 0.9, e.r * 0.28);
      } else if (e.kind === 'queen') {
        ctx2.beginPath();
        ctx2.ellipse(-e.r * 0.7, 0, e.r * 0.7, e.r * 0.28, -0.5, 0, Math.PI * 2);
        ctx2.ellipse(e.r * 0.7, 0, e.r * 0.7, e.r * 0.28, 0.5, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.beginPath();
        ctx2.arc(0, 0, e.r * 0.55, 0, Math.PI * 2);
        ctx2.fill();
      } else if (e.kind === 'king') {
        ctx2.beginPath();
        ctx2.arc(0, e.r * 0.15, e.r * 0.85, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.beginPath();
        ctx2.moveTo(-e.r * 0.7, -e.r * 0.15);
        ctx2.lineTo(-e.r * 0.35, -e.r * 1.15);
        ctx2.lineTo(0, -e.r * 0.35);
        ctx2.lineTo(e.r * 0.35, -e.r * 1.15);
        ctx2.lineTo(e.r * 0.7, -e.r * 0.15);
        ctx2.closePath();
        ctx2.fill();
      } else {
        ctx2.beginPath();
        ctx2.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx2.fill();
      }
    }
    if (e.hurt > 0 && art[e.kind]) {
      ctx2.save();
      ctx2.globalCompositeOperation = 'lighter';
      ctx2.globalAlpha = 0.55;
      drawSprite(art[e.kind], 0, 0, height);
      ctx2.restore();
    } else if (e.hurt > 0) {
      ctx2.save();
      ctx2.globalCompositeOperation = 'lighter';
      ctx2.globalAlpha = 0.45;
      ctx2.fillStyle = '#fff4d2';
      ctx2.beginPath();
      ctx2.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    }
    ctx2.restore();
    if (wind) {
      ctx2.strokeStyle = 'rgba(255, 93, 122, ' + (0.35 + (0.4 - e.cd)) + ')';
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(vis.x, vis.y + bob, e.r + 8 + (0.4 - e.cd) * 16, 0, Math.PI * 2);
      ctx2.stroke();
    }
    if (e.elite) {
      ctx2.strokeStyle = e.trait === 'armored' ? '#9ad7ff' : '#ffb15a';
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(vis.x, vis.y, e.r + 7, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.fillStyle = '#ffd089';
      ctx2.font = '11px sans-serif';
      ctx2.textAlign = 'center';
      ctx2.fillText(e.trait === 'armored' ? '硬' : '裂', vis.x, vis.y - e.r - 8);
    }
    ctx2.fillStyle = 'rgba(0,0,0,0.35)';
    ctx2.fillRect(vis.x - e.r, vis.y + e.r + 4, e.r * 2, 3);
    ctx2.fillStyle = e.phased ? '#ff5d7a' : '#ffd089';
    ctx2.fillRect(vis.x - e.r, vis.y + e.r + 4, e.r * 2 * Math.max(0, e.hp / e.maxHp), 3);
    if (e.burn > 0) {
      ctx2.fillStyle = 'rgba(255, 120, 48, 0.9)';
      ctx2.fillRect(vis.x - 2, vis.y - e.r - 8 - Math.sin(fx.t * 14) * 2, 3, 6);
    }
    if (e.phased) {
      ctx2.strokeStyle = 'rgba(227, 106, 93, 0.85)';
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(vis.x, vis.y, e.r + 10 + Math.sin(fx.t * 8) * 2, 0.2, Math.PI * 1.6);
      ctx2.stroke();
    }
  }

  function drawBolt(b) {
    var col = !b.friendly ? '#ff5d7a' : b.mode === 'lance' ? '#fff6d8' : b.mode === 'fan' ? '#ff9a4a' : b.mode === 'loop' ? '#9ad7ff' : '#ffe08a';
    var spd = Math.hypot(b.vx, b.vy) || 1;
    var tail = b.mode === 'lance' ? 26 : b.mode === 'fan' ? 8 : b.mode === 'loop' ? 16 : 14;
    ctx2.strokeStyle = col;
    ctx2.globalAlpha = 0.55;
    ctx2.lineWidth = b.r;
    ctx2.lineCap = 'round';
    ctx2.beginPath();
    ctx2.moveTo(b.x, b.y);
    ctx2.lineTo(b.x - (b.vx / spd) * tail, b.y - (b.vy / spd) * tail);
    ctx2.stroke();
    ctx2.globalAlpha = 0.35;
    ctx2.fillStyle = col;
    ctx2.beginPath();
    ctx2.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.globalAlpha = 1;
    ctx2.beginPath();
    ctx2.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx2.fill();
  }

  function drawPlayer() {
    var bob = fx.reduced ? 0 : Math.sin(fx.t * (fx.moving ? 13 : 2.4)) * (fx.moving ? 1.8 : 0.8);
    var flicker = 0.22 + Math.sin(fx.t * 9) * 0.08;
    var body = shown('player', run.px, run.py);
    if ((run.dashT || 0) > 0) {
      ctx2.globalAlpha = 0.35;
      ctx2.fillStyle = '#d7ecff';
      ctx2.beginPath();
      ctx2.arc(body.x - (run.dashX || 0) * 16, body.y - (run.dashY || 0) * 16, 10, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.globalAlpha = 1;
    }
    ctx2.save();
    ctx2.translate(body.x, body.y + bob);
    if (run.iframes > 0 && Math.floor(fx.t * 16) % 2 === 0) ctx2.globalAlpha = 0.55;
    ctx2.fillStyle = 'rgba(0,0,0,0.32)';
    ctx2.beginPath();
    ctx2.ellipse(0, 16, 11, 4, 0, 0, Math.PI * 2);
    ctx2.fill();
    var grd = ctx2.createRadialGradient(-6, 4, 2, -6, 4, 34 + Math.sin(fx.t * 8) * 6);
    grd.addColorStop(0, 'rgba(255, 196, 110, ' + (flicker + 0.25) + ')');
    grd.addColorStop(1, 'rgba(255, 160, 60, 0)');
    ctx2.fillStyle = grd;
    ctx2.beginPath();
    ctx2.arc(-6, 4, 36, 0, Math.PI * 2);
    ctx2.fill();
    if (!drawSprite(art.player, 0, 0, 52)) {
      ctx2.fillStyle = '#f2c14e';
      ctx2.beginPath();
      ctx2.arc(0, 0, run.r, 0, Math.PI * 2);
      ctx2.fill();
    }
    if (run.guard > 0) {
      ctx2.strokeStyle = 'rgba(170, 220, 255, 0.9)';
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(0, 0, 22 + Math.sin(fx.t * 6) * 1.4, 0, Math.PI * 2);
      ctx2.stroke();
    }
    ctx2.rotate(Math.atan2(run.fy, run.fx));
    ctx2.fillStyle = run.weapon === 'lance' ? '#fff6d8' : run.weapon === 'fan' ? '#ff9a4a' : run.weapon === 'loop' ? '#9ad7ff' : '#ffd089';
    ctx2.beginPath();
    ctx2.moveTo(30, 0);
    ctx2.lineTo(20, 4.5);
    ctx2.lineTo(20, -4.5);
    ctx2.fill();
    ctx2.restore();
  }

  function roomKnown(room) {
    if (!room) return false;
    if (room.kind === 'boss' && !room.seen && room.id !== run.roomId) return false;
    if (room.seen !== false || room.id === run.roomId) return true;
    var dirs = ['n', 'e', 's', 'w'];
    for (var i = 0; i < dirs.length; i++) {
      var id = room.links[dirs[i]];
      if (id != null && run.rooms[id] && run.rooms[id].seen) return true;
    }
    return false;
  }

  function drawMap() {
    var known = [];
    var i;
    for (i = 0; i < run.rooms.length; i++) if (roomKnown(run.rooms[i])) known.push(run.rooms[i]);
    if (!known.length) return;
    var minX = known[0].gx;
    var minY = known[0].gy;
    var maxX = minX;
    var maxY = minY;
    for (i = 1; i < known.length; i++) {
      if (known[i].gx < minX) minX = known[i].gx;
      if (known[i].gy < minY) minY = known[i].gy;
      if (known[i].gx > maxX) maxX = known[i].gx;
      if (known[i].gy > maxY) maxY = known[i].gy;
    }
    var step = 16;
    var cell = 10;
    var boxW = (maxX - minX) * step + cell;
    var boxH = (maxY - minY) * step + cell;
    var ox = Math.max(L.WALL + 8, W - L.WALL - 10 - boxW);
    var oy = L.WALL + 8;
    function pos(room) {
      return { x: ox + (room.gx - minX) * step, y: oy + (room.gy - minY) * step };
    }
    var ink = { start: '#8d7358', shrine: '#7dcea0', shop: '#e7a04a', cache: '#c4a574', trial: '#b388eb', tide: '#c46b9a', gift: '#8dce7a', talent: '#7ec8e0', wager: '#d07ad0' };
    ctx2.strokeStyle = 'rgba(244, 234, 215, 0.35)';
    ctx2.lineWidth = 2;
    for (i = 0; i < known.length; i++) {
      var room = known[i];
      var here = pos(room);
      var dirs = ['n', 'e', 's', 'w'];
      for (var d = 0; d < dirs.length; d++) {
        var id = room.links[dirs[d]];
        if (id == null || id < room.id) continue;
        var next = run.rooms[id];
        if (!next || !roomKnown(next)) continue;
        var there = pos(next);
        ctx2.beginPath();
        ctx2.moveTo(here.x + cell / 2, here.y + cell / 2);
        ctx2.lineTo(there.x + cell / 2, there.y + cell / 2);
        ctx2.stroke();
      }
    }
    for (i = 0; i < known.length; i++) {
      room = known[i];
      here = pos(room);
      var seen = room.seen || room.id === run.roomId;
      ctx2.fillStyle = room.cleared ? '#6d6458' : '#2c2833';
      if (ink[room.kind] && seen && room.kind !== 'boss') ctx2.fillStyle = ink[room.kind];
      if (room.kind === 'cache' && seen && !room.unlocked) ctx2.fillStyle = '#6a4a28';
      if (room.id === run.roomId) ctx2.fillStyle = '#ffd089';
      ctx2.fillRect(here.x, here.y, cell, cell);
    }
  }

  function paintShop() {
    $('shop-ash').textContent = '灰烬 ' + (meta.ash || 0);
    var html = '';
    L.SHOP.forEach(function (item) {
      var lv = meta[item.key] || 0;
      var maxed = lv >= item.max;
      html += '<div class="shop-item"><div><strong>' + item.name + '</strong><p>' + item.desc +
        ' · ' + lv + '/' + item.max + '</p></div><button type="button" data-buy="' + item.key + '"' +
        (maxed ? ' disabled' : '') + '>' + (maxed ? '满了' : L.price(meta, item.key) + ' 灰烬') + '</button></div>';
    });
    $('shop-list').innerHTML = html;
  }

  function bindStick(el, key) {
    var knob = el.querySelector('.knob');
    function pos(e) {
      var b = el.getBoundingClientRect();
      var dx = e.clientX - (b.left + b.width / 2);
      var dy = e.clientY - (b.top + b.height / 2);
      var m = Math.hypot(dx, dy) || 1;
      var max = b.width * 0.34;
      var k = Math.min(max, m);
      sticks[key].x = (dx / m) * (k / max);
      sticks[key].y = (dy / m) * (k / max);
      knob.style.transform = 'translate(' + (dx / m) * k + 'px,' + (dy / m) * k + 'px)';
    }
    function end() {
      sticks[key].id = null;
      sticks[key].x = 0;
      sticks[key].y = 0;
      knob.style.transform = 'none';
    }
    T.on(el, 'pointerdown', function (e) {
      touchMode = true;
      $('sticks').classList.remove('hidden');
      sticks[key].id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      pos(e);
      e.preventDefault();
    });
    T.on(el, 'pointermove', function (e) {
      if (sticks[key].id !== e.pointerId) return;
      pos(e);
    });
    T.on(el, 'pointerup', function (e) { if (sticks[key].id === e.pointerId) end(); });
    T.on(el, 'pointercancel', function (e) { if (sticks[key].id === e.pointerId) end(); });
  }

  function ensureGrowth() {
    if (!meta.growth) meta.growth = G.blank();
    meta.growth = G.normalize(meta.growth);
    if (!meta.growth.id) {
      var user = host && host.telegram && host.telegram.initDataUnsafe && host.telegram.initDataUnsafe.user;
      meta.growth.id = user && user.id ? ('u' + user.id) : ('p' + Math.random().toString(36).slice(2, 10));
    }
  }

  function channelName() {
    var cfg = window.CINDERWELL_TG || {};
    return String(cfg.channel || '').replace(/^@/, '');
  }

  function milestoneGoal() {
    return channelName() ? G.GOAL : 6;
  }

  function loadGrowthBook() {
    try { growthBook = JSON.parse(localStorage.getItem('cinderwell.referrals.v1') || '{}'); }
    catch (e) { growthBook = {}; }
  }

  function saveGrowthBook() {
    try { localStorage.setItem('cinderwell.referrals.v1', JSON.stringify(growthBook)); } catch (e) {}
  }

  function absorbVisit() {
    ensureGrowth();
    var param = '';
    try {
      var q = new URLSearchParams(location.search);
      param = q.get('ref') || q.get('tgWebAppStartParam') || '';
    } catch (e) {}
    if (!param && host && host.telegram && host.telegram.initDataUnsafe) {
      param = host.telegram.initDataUnsafe.start_param || '';
    }
    var parsed = G.parseStart(param);
    var user = host && host.telegram && host.telegram.initDataUnsafe && host.telegram.initDataUnsafe.user;
    var premium = false;
    try { premium = new URLSearchParams(location.search).get('premium') === '1'; } catch (e) {}
    if (user && user.is_premium) premium = true;
    if (parsed.inviter) {
      var noted = G.noteVisit(growthBook, parsed.inviter, meta.growth.id, premium);
      growthBook = noted.book;
      saveGrowthBook();
    }
    if (parsed.squad && !meta.growth.squad) meta.growth.squad = parsed.squad;
    noteSource();
    var mine = G.credits(growthBook, meta.growth.id);
    meta.growth.friends = Math.max(meta.growth.friends || 0, mine.friends);
    meta.growth.premium = Math.max(meta.growth.premium || 0, mine.premium);
  }

  function pageTelegram() {
    return window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  }

  function signedInitData() {
    var tg = pageTelegram();
    var fromPage = tg && typeof tg.initData === 'string' ? tg.initData : '';
    if (fromPage.length >= 20) return fromPage;
    var fromHost = host && host.telegram && typeof host.telegram.initData === 'string' ? host.telegram.initData : '';
    return fromHost.length >= 20 ? fromHost : '';
  }

  function forgedIdentity() {
    var tg = pageTelegram();
    var unsafe = (tg && tg.initDataUnsafe) || (host && host.telegram && host.telegram.initDataUnsafe) || null;
    var user = unsafe && unsafe.user;
    return !!(user && user.id) && !signedInitData();
  }

  function noteSource() {
    var incoming = 'direct';
    try { incoming = G.parseSource(new URLSearchParams(location.search).get('source')); } catch (e) {}
    var prev = meta.growth.source || 'direct';
    if ((prev === 'direct' || !meta.growth.source) && incoming !== prev) {
      meta.growth.source = incoming;
      persist();
    }
    if (incoming === 'direct') return;
    var seen = '';
    try { seen = sessionStorage.getItem('cinderwell.track.click') || ''; } catch (e2) {}
    if (seen === incoming) return;
    try { sessionStorage.setItem('cinderwell.track.click', incoming); } catch (e3) {}
    reportTrack('click');
  }

  function reportTrack(event) {
    var cfg = window.CINDERWELL_TG || {};
    var api = String(cfg.api || '').replace(/\/$/, '');
    if (!api) return;
    var body = {
      source: (meta.growth && meta.growth.source) || 'direct',
      event: event,
      initData: event === 'claim' ? signedInitData() : ''
    };
    try {
      fetch(api + '/api/v1/growth/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).catch(function () {});
    } catch (e) {}
  }

  function squadRows() {
    if (meta.growth && meta.growth.board && meta.growth.board.length) return meta.growth.board;
    var book = {};
    try { book = JSON.parse(localStorage.getItem('cinderwell.squads.v1') || '{}'); } catch (e) { book = {}; }
    return Object.keys(book).map(function (key) { return book[key]; });
  }

  function rememberSquad() {
    if (!meta.growth || !meta.growth.squad) return;
    var book = {};
    try { book = JSON.parse(localStorage.getItem('cinderwell.squads.v1') || '{}'); } catch (e) { book = {}; }
    book[meta.growth.squad] = { slug: meta.growth.squad, title: meta.growth.squad, score: meta.best || 0 };
    try { localStorage.setItem('cinderwell.squads.v1', JSON.stringify(book)); } catch (e2) {}
  }

  function hostCall(op, extra) {
    if (!T.embedded || !window.parent || window.parent === window) return false;
    var bag = {};
    String(location.hash || '').replace(/^#/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i < 0) return;
      try { bag[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); } catch (e) {}
    });
    if (!bag.nonce || !bag.po) return false;
    var payload = { op: op };
    if (extra) Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
    try {
      window.parent.postMessage({ ns: 'tgmp', v: 1, type: 'tg', nonce: bag.nonce, payload: payload }, bag.po);
      return true;
    } catch (e) { return false; }
  }

  function syncGrowth() {
    ensureGrowth();
    hostCall('growthSync', {
      startParam: G.startParam(meta.growth),
      squad: meta.growth.squad || '',
      score: meta.best || 0
    });
  }

  function inviteTarget() {
    ensureGrowth();
    var cfg = window.CINDERWELL_TG || {};
    return G.inviteTarget(location.href, cfg.bot || '', cfg.app || 'cinderwell', G.startParam(meta.growth), cfg.publicUrl || '');
  }

  function cursorUrl() {
    var cfg = window.CINDERWELL_TG || {};
    var custom = String(cfg.cursorUrl || '').trim();
    if (/^https:\/\/[A-Za-z0-9.-]+\//.test(custom)) return custom;
    return G.CURSOR_URL;
  }

  function openExternal(url) {
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg && typeof tg.openLink === 'function') {
      try { tg.openLink(url); return; } catch (e) {}
    }
    window.open(url, '_blank', 'noopener');
  }

  function openCursor() {
    ensureGrowth();
    openExternal(cursorUrl());
    if (L.grantCursor(meta)) {
      $('growth-copy').textContent = '冥想完成。灰烬 +500。下一局芯火得到 AI 强化。';
      blip(880, 0.1, 'triangle', 0.04);
    } else {
      $('growth-copy').textContent = '冥想已经完成。奖励不会再发一次。';
    }
    persist();
    paintMenu();
    paintGrowth();
  }

  function openShare(url) {
    if (hostCall('openTelegramLink', { url: url })) return;
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.openTelegramLink) {
      try { tg.openTelegramLink(url); return; } catch (e) {}
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(function () {});
    }
    $('growth-copy').textContent = '邀请链接已复制，贴到聊天里即可。';
  }

  function paintGrowth() {
    ensureGrowth();
    var got = G.points(meta.growth);
    var goal = milestoneGoal();
    var pct = Math.round(Math.min(1, got / goal) * 100);
    $('growth-fill').style.width = pct + '%';
    $('growth-points').textContent = Math.min(got, goal) + ' / ' + goal + (meta.badge ? ' · 星标已领' : '');
    var tasks = [
      '基础进度已计入',
      meta.growth.shared ? '邀请已经发出' : '发出一次邀请',
      meta.growth.friends > 0 ? '已有好友从链接进来' : '一位好友从你的链接进来',
      meta.growth.premium > 0 ? 'Premium 好友已加成' : 'Premium 好友会再加一截'
    ];
    if (channelName()) tasks.splice(1, 0, meta.growth.channel ? '已打开官方频道' : '打开官方频道');
    var cursorDone = !!meta.cursor;
    var cursor = '<li><button type="button" class="task-link" id="btn-cursor">'
      + (cursorDone ? '🔮 AI 冥想已完成' : G.CURSOR_NAME)
      + '</button><p class="cursor-note">' + G.CURSOR_DESC + '</p></li>';
    $('growth-tasks').innerHTML = tasks.map(function (line) { return '<li>' + line + '</li>'; }).join('') + cursor;
    $('btn-channel').classList.toggle('hidden', !channelName());
    $('btn-claim').disabled = !(got >= goal && !meta.badge);
    $('squad-input').value = meta.growth.squad ? ('@' + meta.growth.squad) : '';
    var rows = squadRows().sort(function (a, b) { return (b.score || 0) - (a.score || 0); }).slice(0, 5);
    $('squad-board').textContent = rows.length
      ? rows.map(function (row, i) { return (i + 1) + '. @' + row.slug + ' ' + (row.score || 0); }).join('   ')
      : '还没有公会积分';
  }

  function maybeRally() {
    ensureGrowth();
    var note = G.challenge(squadRows(), meta.growth.squad, meta.growth.rankSeen || 0);
    if (!note || screen === 'rally' || meta.growth.rallyMute === note.rank) return;
    $('rally-text').textContent = note.text;
    meta.growth.pendingRank = note.rank;
    show('rally');
  }

  function bind() {
    bindStick($('stick-l'), 'l');
    bindStick($('stick-r'), 'r');
    T.on($('flare-btn'), 'pointerdown', function (e) {
      ensureAudio();
      flareHeld = true;
      e.preventDefault();
    });
    T.on($('flare-btn'), 'pointerup', function () { flareHeld = false; });
    T.on($('flare-btn'), 'pointercancel', function () { flareHeld = false; });
    T.on($('dash-btn'), 'pointerdown', function (e) {
      ensureAudio();
      dashHeld = true;
      e.preventDefault();
    });
    T.on($('dash-btn'), 'pointerup', function () { dashHeld = false; });
    T.on($('dash-btn'), 'pointercancel', function () { dashHeld = false; });
    T.on(window, 'keydown', function (e) {
      keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
      if (e.code === 'Escape' && screen === 'play') { localPaused = true; show('pause'); persist(); }
    });
    T.on(window, 'keyup', function (e) { keys[e.code] = false; });
    T.on(cv, 'pointerdown', function (e) {
      if (e.target !== cv) return;
      ensureAudio();
      pointer.down = true;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    });
    T.on(window, 'pointermove', function (e) {
      if (!pointer.down) return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    });
    T.on(window, 'pointerup', function () { pointer.down = false; });
    T.on($('btn-start'), 'click', function () { startRun(true); });
    T.on($('btn-continue'), 'click', function () { startRun(false); });
    T.on($('btn-shop'), 'click', function () { show('shop'); });
    T.on($('btn-menu-growth'), 'click', function () { show('growth'); });
    T.on($('btn-menu-invite'), 'click', sendInvite);
    T.on($('end-invite'), 'click', sendInvite);
    T.on($('btn-growth'), 'click', function () { show('growth'); });
    T.on($('growth-back'), 'click', function () { show('menu'); });
    T.on($('btn-invite'), 'click', sendInvite);
    T.on($('btn-channel'), 'click', function () {
      var name = channelName();
      if (!name) return;
      pendingChannel = true;
      var url = 'https://t.me/' + name;
      if (hostCall('openTelegramLink', { url: url })) return;
      window.open(url, '_blank', 'noopener');
    });
    T.on($('btn-claim'), 'click', function () {
      ensureGrowth();
      if (G.points(meta.growth) < milestoneGoal() || meta.badge) return;
      if (forgedIdentity()) {
        $('growth-copy').textContent = '这不是 Telegram 里的真实身份，星标不发。';
        return;
      }
      meta.badge = 1;
      meta.ash = (meta.ash || 0) + 12;
      persist();
      if (signedInitData()) reportTrack('claim');
      paintMenu();
      $('growth-copy').textContent = '星标已领。下一局多一发焰弹，灰烬 +12。';
      paintGrowth();
    });
    T.on($('btn-squad'), 'click', function () {
      ensureGrowth();
      var name = G.slug($('squad-input').value);
      if (!name) {
        $('growth-copy').textContent = '请填公开群用户名，例如 @Cinderwell。';
        return;
      }
      meta.growth.squad = name;
      rememberSquad();
      persist();
      syncGrowth();
      paintGrowth();
      $('growth-copy').textContent = '已加入 @' + name + '。积分按你的最高分计入，不会扣别人的分。';
    });
    T.on($('growth-tasks'), 'click', function (e) {
      var node = e.target;
      while (node && node !== $('growth-tasks')) {
        if (node.id === 'btn-cursor') { openCursor(); return; }
        node = node.parentNode;
      }
    });
    T.on($('btn-rally'), 'click', function () {
      ensureGrowth();
      var url = G.shareLink(inviteTarget());
      meta.growth.rankSeen = meta.growth.pendingRank || meta.growth.rankSeen;
      meta.growth.rallyMute = meta.growth.pendingRank || meta.growth.rallyMute;
      persist();
      openShare(url);
    });
    T.on($('rally-back'), 'click', function () {
      ensureGrowth();
      meta.growth.rankSeen = meta.growth.pendingRank || meta.growth.rankSeen;
      meta.growth.rallyMute = meta.growth.pendingRank || meta.growth.rallyMute;
      persist();
      show('menu');
    });
    T.on(document, 'visibilitychange', function () {
      if (document.visibilityState !== 'visible' || !pendingChannel) return;
      pendingChannel = false;
      ensureGrowth();
      meta.growth.channel = true;
      persist();
      if (screen === 'growth') paintGrowth();
    });
    T.on($('btn-help'), 'click', function () { show('help'); });
    T.on($('shop-back'), 'click', function () { show('menu'); });
    T.on($('help-back'), 'click', function () { show('menu'); });
    T.on($('shop-list'), 'click', function (e) {
      var key = e.target && e.target.getAttribute && e.target.getAttribute('data-buy');
      if (!key) return;
      if (L.buy(meta, key)) {
        blip(700, 0.08, 'triangle', 0.03);
        persist();
      }
      paintShop();
    });
    T.on($('pause-btn'), 'click', function () {
      if (screen !== 'play') return;
      localPaused = true;
      persist();
      show('pause');
    });
    T.on($('btn-resume'), 'click', function () {
      if (hostPaused) return;
      localPaused = false;
      show('play');
    });
    T.on($('btn-quit'), 'click', function () {
      localPaused = false;
      persist();
      show('menu');
    });
    T.on($('btn-revive'), 'click', function () {
      watchAd($('btn-revive'), 'revive', 'revive-note', function () {
        if (!run || !L.revive(run)) return;
        ended = false;
        T.reportEvent('ad.reward', { kind: 'revive', floor: run.floor });
        show('play');
        persist();
      });
    });
    T.on($('btn-give-up'), 'click', function () { if (run) finish('dead'); });
    T.on($('end-double'), 'click', function () {
      watchAd($('end-double'), 'double', 'end-note', function () {
        if (lastGained <= 0) return;
        meta.ash = (meta.ash || 0) + lastGained;
        T.reportEvent('ad.reward', { kind: 'double', ash: lastGained });
        $('end-text').textContent += ' 翻倍后再得 ' + lastGained + '。';
        lastGained = 0;
        $('end-double').classList.add('hidden');
        persist();
        paintMenu();
      });
    });
    T.on($('end-again'), 'click', function () { startRun(true); });
    T.on($('end-menu'), 'click', function () { show('menu'); });
    T.on(window, 'message', function (ev) {
      var m = ev.data;
      if (!m || m.ns !== 'tgmp' || m.type !== 'growth' || !m.payload) return;
      var view = m.payload;
      ensureGrowth();
      if (typeof view.friends === 'number') meta.growth.friends = view.friends;
      if (typeof view.premiumFriends === 'number') meta.growth.premium = view.premiumFriends;
      if (view.squad) meta.growth.squad = G.slug(view.squad);
      if (view.board) meta.growth.board = view.board;
      persist();
      if (screen === 'growth') paintGrowth();
    });
    T.on(window, 'resize', function () { resize(); });
    T.on(document, 'touchmove', function (e) { e.preventDefault(); }, { passive: false });
    T.on(document, 'gesturestart', function (e) { e.preventDefault(); }, { passive: false });
  }

  T.createGame({
    initialize: function (ctx) {
      cv = $('cv');
      ctx2 = cv.getContext('2d');
      var saved = ctx && ctx.progress;
      if (saved && saved.meta) meta = Object.assign(L.newMeta(), saved.meta);
      run = saved && saved.run ? L.restore(saved.run) : null;
      host = ctx || null;
      loadGrowthBook();
      absorbVisit();
      syncGrowth();
      var b = (ctx && ctx.build) || window.TGMP_BUILD || {};
      $('badge').textContent = b.label || (b.version ? 'v' + b.version : '灯塔');
      setupTelegram();
      bind();
      loadArt();
      resize();
      show('menu');
    },
    start: function () {
      resize();
      T.setTimeout(resize, 280);
      if (!raf) raf = window.requestAnimationFrame(loop);
    },
    pause: function () {
      hostPaused = true;
      if (screen === 'play') {
        show('pause');
        persist();
      }
    },
    resume: function () {
      hostPaused = false;
      if (screen === 'pause' && !localPaused) show('play');
    },
    destroy: function () {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      persist();
    }
  });
})();
