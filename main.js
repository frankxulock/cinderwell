/* 烬井界面：竖屏双摇杆，接到 TGMP 的暂停、存档和结算。 */
(function () {
  'use strict';

  var L = window.CinderwellLogic;
  var T = window.TGMP;
  var A = window.CinderwellAds;
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
  var audio = null;
  var ended = false;
  var lastGained = 0;
  var adBusy = false;
  var touchMode = false;
  var art = {};

  function $(id) { return document.getElementById(id); }

  function show(name) {
    screen = name;
    ['menu', 'shop', 'help', 'pause', 'revive', 'end'].forEach(function (n) {
      $('screen-' + n).classList.toggle('hidden', n !== name);
    });
    var playing = name === 'play';
    $('overlay').classList.toggle('hidden', playing);
    $('overlay').classList.toggle('play', false);
    $('hud').classList.toggle('hidden', !playing && name !== 'pause');
    var sticksOn = playing && (touchMode || window.matchMedia('(pointer: coarse)').matches);
    $('sticks').classList.toggle('hidden', !sticksOn);
    if (name === 'menu') paintMenu();
    if (name === 'shop') paintShop();
  }

  function paintMenu() {
    $('menu-best').textContent = '最高 ' + (meta.best || 0);
    $('menu-ash').textContent = '灰烬 ' + (meta.ash || 0);
    $('btn-continue').classList.toggle('hidden', !hasRun());
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
      else if (e === 'win') blip(720, 0.2, 'triangle', 0.04);
    }
  }

  function startRun(fresh) {
    ensureAudio();
    ended = false;
    if (fresh || !hasRun()) {
      run = L.createRun((Math.random() * 0xffffffff) >>> 0 || 1, meta);
      run.toast = '第 1 层';
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
    T.gameOver(score);
    T.reportEvent(kind === 'win' ? 'game.win' : 'game.over', { score: score, floor: run.floor });
    run = null;
    persist();
    $('end-title').textContent = kind === 'win' ? '出井了' : '灯灭了';
    $('end-text').textContent = (kind === 'win' ? '窑主熄了。' : '灯油烧尽。') +
      ' 得分 ' + score + '，带回灰烬 ' + gained + '。';
    $('end-double').classList.toggle('hidden', gained <= 0);
    show('end');
  }

  function watchAd(btn, onReward) {
    if (adBusy) return;
    adBusy = true;
    btn.disabled = true;
    if (audio && audio.state === 'running') audio.suspend();
    A.rewarded().then(function (ok) {
      adBusy = false;
      btn.disabled = false;
      if (audio && audio.state === 'suspended') audio.resume();
      if (ok) onReward();
      else T.reportEvent('ad.skip', {});
    });
  }

  function died() {
    if (run.revived) {
      finish('dead');
      return;
    }
    T.reportEvent('ad.offer', { kind: 'revive', floor: run.floor });
    show('revive');
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
    return { mx: mx, my: my, ax: ax, ay: ay, flare: flareHeld || !!keys.Space || !!keys.KeyJ };
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
    var paused = hostPaused || localPaused || screen !== 'play';
    if (!paused && run && run.status === 'play') {
      L.step(run, readInput(), dt);
      playEvents(run.events);
      if (run.status === 'win') finish('win');
      else if (run.status === 'dead') died();
    }
    paint();
    if (run && screen === 'play') paintHud();
  }

  function paintHud() {
    $('floor-label').textContent = '第 ' + run.floor + ' 层';
    $('score').textContent = String(run.score);
    $('res').textContent = '烬 ' + run.cinders + '   火印 ' + run.seals + '   焰弹 ' + run.flares;
    var oils = '';
    for (var i = 0; i < run.maxHp; i++) oils += '<i class="oil' + (i < run.hp ? ' on' : '') + '"></i>';
    $('oils').innerHTML = oils;
    var toast = $('toast');
    if (run.toastT > 0 && run.toast) {
      toast.textContent = run.toast;
      toast.classList.remove('hidden');
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
      shake = Math.sin(run.time * 60) * 3 * run.shake;
      ctx2.translate(shake, 0);
    }
    drawRoom(L && run.rooms[run.roomId]);
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
    if (art.player) drawSprite(art.player, 8, 78, 150);
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
      if (room.kind === 'boss' || room.kind === 'shop' || room.kind === 'shrine') {
        ctx2.fillStyle = room.kind === 'boss' ? 'rgba(90, 24, 18, 0.28)' : room.kind === 'shop' ? 'rgba(90, 60, 18, 0.22)' : 'rgba(40, 70, 48, 0.18)';
        ctx2.fillRect(L.WALL, L.WALL, W - L.WALL * 2, H - L.WALL * 2);
      }
    } else {
      ctx2.fillStyle = room.kind === 'boss' ? '#24161c' : room.kind === 'shop' ? '#241e16' : '#1a1722';
      ctx2.fillRect(L.WALL, L.WALL, W - L.WALL * 2, H - L.WALL * 2);
    }
    ctx2.fillStyle = '#2a2436';
    ctx2.fillRect(0, 0, W, L.WALL);
    ctx2.fillRect(0, H - L.WALL, W, L.WALL);
    ctx2.fillRect(0, 0, L.WALL, H);
    ctx2.fillRect(W - L.WALL, 0, L.WALL, H);
    drawDoors(room);
    for (var i = 0; i < room.pickups.length; i++) drawPickup(room.pickups[i]);
    for (i = 0; i < room.enemies.length; i++) drawEnemy(room.enemies[i]);
    for (i = 0; i < run.bolts.length; i++) drawBolt(run.bolts[i]);
    if (run.orbit > 0) {
      ctx2.fillStyle = '#ffd089';
      ctx2.beginPath();
      ctx2.arc(run.orbitX || run.px, run.orbitY || run.py, 5, 0, Math.PI * 2);
      ctx2.fill();
    }
    drawPlayer();
    var shade = ctx2.createRadialGradient(run.px, run.py, 30, run.px, run.py, 250);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(6, 4, 10, 0.55)');
    ctx2.fillStyle = shade;
    ctx2.fillRect(0, 0, W, H);
    drawMap();
    if (room.kind === 'cache' && !room.unlocked) {
      ctx2.fillStyle = 'rgba(244,234,215,0.8)';
      ctx2.font = '14px sans-serif';
      ctx2.textAlign = 'center';
      ctx2.fillText('库房', W / 2, 48);
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
      ctx2.fillStyle = open ? '#120e16' : (dest.kind === 'cache' && !dest.unlocked ? '#6a4a28' : '#2a2433');
      ctx2.fillRect(d[1], d[2], d[3], d[4]);
      if (!open) {
        ctx2.strokeStyle = '#8d7b6a';
        ctx2.lineWidth = 2;
        ctx2.strokeRect(d[1] + 6, d[2] + 4, d[3] - 12, d[4] - 8);
      }
    }
  }

  function drawPickup(p) {
    var key = p.kind === 'item' ? 'relic' : p.kind;
    var painted = drawSprite(art[key], p.x, p.y, (p.r || 10) * 2.8);
    if (!painted) {
      ctx2.fillStyle = p.kind === 'item' ? '#9dffc8' : '#e7a04a';
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r || 8, 0, Math.PI * 2);
      ctx2.fill();
    }
    if (p.kind === 'item') {
      ctx2.fillStyle = '#f4ead7';
      ctx2.font = '11px sans-serif';
      ctx2.textAlign = 'center';
      ctx2.fillText(L.itemName(p.item), p.x, p.y + (p.r || 10) + 14);
    }
    if (p.price) {
      ctx2.fillStyle = '#ffd089';
      ctx2.font = '11px sans-serif';
      ctx2.textAlign = 'center';
      ctx2.fillText(String(p.price), p.x, p.y + (p.r || 10) + 26);
    }
  }

  function drawEnemy(e) {
    ctx2.save();
    ctx2.translate(e.x, e.y);
    var height = e.r * (e.kind === 'warden' ? 2.7 : 3.1);
    if (!drawSprite(art[e.kind], 0, 0, height)) {
      var col = e.kind === 'warden' ? '#e36a5d' : e.kind === 'spit' ? '#3dcec4' : e.kind === 'husk' ? '#c46b4a' : '#8b6cff';
      ctx2.fillStyle = col;
      ctx2.beginPath();
      ctx2.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx2.fill();
    }
    if (e.hurt > 0 && art[e.kind]) {
      ctx2.save();
      ctx2.globalCompositeOperation = 'lighter';
      ctx2.globalAlpha = 0.55;
      drawSprite(art[e.kind], 0, 0, height);
      ctx2.restore();
    }
    if ((e.kind === 'spit' || e.kind === 'warden') && e.cd < 0.28) {
      ctx2.strokeStyle = 'rgba(255,93,122,0.8)';
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(0, 0, e.r + 6, 0, Math.PI * 2);
      ctx2.stroke();
    }
    ctx2.fillStyle = 'rgba(0,0,0,0.35)';
    ctx2.fillRect(-e.r, e.r + 3, e.r * 2, 3);
    ctx2.fillStyle = '#ffd089';
    ctx2.fillRect(-e.r, e.r + 3, e.r * 2 * Math.max(0, e.hp / e.maxHp), 3);
    ctx2.restore();
  }

  function drawBolt(b) {
    ctx2.fillStyle = b.friendly ? '#ffe08a' : '#ff5d7a';
    ctx2.beginPath();
    ctx2.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx2.fill();
  }

  function drawPlayer() {
    var blink = run.iframes > 0 && Math.floor(run.time * 16) % 2 === 0;
    if (blink) return;
    ctx2.save();
    ctx2.translate(run.px, run.py);
    var grd = ctx2.createRadialGradient(0, 0, 2, 0, 0, 36);
    grd.addColorStop(0, 'rgba(255, 208, 137, 0.35)');
    grd.addColorStop(1, 'rgba(255, 208, 137, 0)');
    ctx2.fillStyle = grd;
    ctx2.beginPath();
    ctx2.arc(0, 0, 36, 0, Math.PI * 2);
    ctx2.fill();
    if (!drawSprite(art.player, 0, 2, 42)) {
      ctx2.fillStyle = '#f2c14e';
      ctx2.beginPath();
      ctx2.arc(0, 0, run.r, 0, Math.PI * 2);
      ctx2.fill();
    }
    ctx2.rotate(Math.atan2(run.fy, run.fx));
    ctx2.fillStyle = '#ffd089';
    ctx2.fillRect(16, -1.5, 8, 3);
    ctx2.restore();
  }

  function drawMap() {
    var ox = W - L.WALL - 52;
    var oy = L.WALL + 8;
    for (var i = 0; i < run.rooms.length; i++) {
      var room = run.rooms[i];
      var x = ox + room.gx * 14;
      var y = oy + room.gy * 14;
      ctx2.fillStyle = room.id === run.roomId ? '#ffd089' : room.cleared ? '#6d6458' : '#2c2833';
      if (room.kind === 'boss' && room.id !== run.roomId) ctx2.fillStyle = '#e36a5d';
      ctx2.fillRect(x, y, 10, 10);
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
      watchAd($('btn-revive'), function () {
        if (!run || !L.revive(run)) return;
        T.reportEvent('ad.reward', { kind: 'revive', floor: run.floor });
        show('play');
        persist();
      });
    });
    T.on($('btn-give-up'), 'click', function () { if (run) finish('dead'); });
    T.on($('end-double'), 'click', function () {
      watchAd($('end-double'), function () {
        if (lastGained <= 0) return;
        meta.ash = (meta.ash || 0) + lastGained;
        T.reportEvent('ad.reward', { kind: 'double', ash: lastGained });
        $('end-text').textContent += ' 翻倍后再得 ' + lastGained + '。';
        lastGained = 0;
        $('end-double').classList.add('hidden');
        persist();
      });
    });
    T.on($('end-again'), 'click', function () { startRun(true); });
    T.on($('end-menu'), 'click', function () { show('menu'); });
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
      var b = (ctx && ctx.build) || window.TGMP_BUILD || {};
      $('badge').textContent = b.label || (b.version ? 'v' + b.version : '灯塔');
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
        $('pause-text').textContent = '先停在这一层。';
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
