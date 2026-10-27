/* 烬井：房间制地牢的纯逻辑。画面与名字都是原创，不使用任何现成商业作品的角色或道具。 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CinderwellLogic = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var ROOM_W = 360;
  var ROOM_H = 520;
  var WALL = 26;
  var DOOR_W = 64;
  var PLAYER_R = 11;
  var SPEED = 168;
  var FLOORS = 3;

  var ITEMS = {
    split: { name: '双焰', desc: '火花 +1' },
    bore: { name: '透火', desc: '穿透 +1' },
    haste: { name: '急烬', desc: '射击更快' },
    halo: { name: '环灯', desc: '环绕火星' },
    vial: { name: '灯油瓶', desc: '灯油上限 +1' },
    ember: { name: '炽芯', desc: '伤害 +1' }
  };

  var SHOP = [
    { key: 'vial', name: '备用灯油', max: 3, cost: 6, desc: '开局灯油上限 +1' },
    { key: 'flare', name: '焰弹袋', max: 2, cost: 8, desc: '开局焰弹 +1' },
    { key: 'split', name: '双焰灯芯', max: 1, cost: 12, desc: '开局多一发火花' }
  ];

  var OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
  var DIRS = ['n', 'e', 's', 'w'];

  function makeRng(seed) {
    var a = seed >>> 0;
    return {
      next: function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = Math.imul(a ^ (a >>> 15), a | 1);
        t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      get: function () { return a >>> 0; }
    };
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function shopDef(key) {
    for (var i = 0; i < SHOP.length; i++) if (SHOP[i].key === key) return SHOP[i];
    return null;
  }

  function newMeta() {
    return { best: 0, ash: 0, vial: 0, flare: 0, split: 0 };
  }

  function price(meta, key) {
    var d = shopDef(key);
    if (!d) return 0;
    return d.cost * (((meta && meta[key]) || 0) + 1);
  }

  function buy(meta, key) {
    var d = shopDef(key);
    if (!d || !meta) return false;
    var lv = meta[key] || 0;
    if (lv >= d.max) return false;
    var p = d.cost * (lv + 1);
    if ((meta.ash || 0) < p) return false;
    meta.ash -= p;
    meta[key] = lv + 1;
    return true;
  }

  function idle() {
    return { mx: 0, my: 0, ax: 0, ay: 0, flare: false };
  }

  function makeEnemy(kind, x, y, floor, id) {
    var table = {
      mote: { hp: 3, r: 11, speed: 74, cd: 0 },
      spit: { hp: 4, r: 12, speed: 48, cd: 1.05 },
      husk: { hp: 9, r: 16, speed: 34, cd: 0 },
      warden: { hp: 34, r: 24, speed: 42, cd: 1.35 }
    };
    var t = table[kind] || table.mote;
    var extra = kind === 'warden' ? floor * 8 : Math.max(0, floor - 1);
    var hp = t.hp + extra;
    return {
      id: id, kind: kind, x: x, y: y, r: t.r, hp: hp, maxHp: hp,
      speed: t.speed, cd: t.cd, hurt: 0, orbitCd: 0, spin: 0
    };
  }

  function ringPoint(rng, i, n) {
    var a = ((i + 0.35) / n) * Math.PI * 2 + rng.next() * 0.4;
    var dist = 86 + rng.next() * 36;
    return {
      x: clamp(ROOM_W / 2 + Math.cos(a) * dist, WALL + 24, ROOM_W - WALL - 24),
      y: clamp(ROOM_H / 2 + Math.sin(a) * dist * 0.82, WALL + 24, ROOM_H - WALL - 24)
    };
  }

  function pickItems(rng, n) {
    var pool = ['split', 'bore', 'haste', 'halo', 'vial', 'ember'];
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(rng.next() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, n);
  }

  function buildFloor(rng, floor) {
    var rooms = [];
    var grid = [];
    var id = 0;
    var y, x;
    for (y = 0; y < 3; y++) {
      grid[y] = [];
      for (x = 0; x < 3; x++) {
        var room = {
          id: id, gx: x, gy: y, kind: 'combat',
          links: { n: null, e: null, s: null, w: null },
          cleared: false, unlocked: false, enemies: [], pickups: [], rewarded: false
        };
        grid[y][x] = room;
        rooms.push(room);
        id++;
      }
    }
    for (y = 0; y < 3; y++) {
      for (x = 0; x < 3; x++) {
        var room = grid[y][x];
        if (y > 0) { room.links.n = grid[y - 1][x].id; }
        if (y < 2) { room.links.s = grid[y + 1][x].id; }
        if (x > 0) { room.links.w = grid[y][x - 1].id; }
        if (x < 2) { room.links.e = grid[y][x + 1].id; }
      }
    }
    var start = grid[1][1];
    start.kind = 'start';
    start.cleared = true;
    var corners = [grid[0][0], grid[0][2], grid[2][0], grid[2][2]];
    var boss = corners[Math.floor(rng.next() * corners.length)];
    boss.kind = 'boss';
    var rest = [];
    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i] !== start && rooms[i] !== boss) rest.push(rooms[i]);
    }
    for (i = rest.length - 1; i > 0; i--) {
      var j = Math.floor(rng.next() * (i + 1));
      var tmp = rest[i]; rest[i] = rest[j]; rest[j] = tmp;
    }
    rest[0].kind = 'cache';
    rest[0].cleared = true;
    rest[1].kind = 'shrine';
    rest[1].cleared = true;
    rest[2].kind = 'shop';
    rest[2].cleared = true;

    var seq = { n: 1 };
    var items = pickItems(rng, 4);
    rest[1].pickups.push({ kind: 'item', item: items[0], x: ROOM_W / 2, y: ROOM_H / 2, r: 14, price: 0 });
    rest[2].pickups.push({ kind: 'item', item: items[1], x: ROOM_W / 2 - 48, y: ROOM_H / 2, r: 14, price: 8 + floor * 2 });
    rest[2].pickups.push({ kind: 'item', item: items[2], x: ROOM_W / 2 + 48, y: ROOM_H / 2, r: 14, price: 12 + floor * 2 });
    rest[0].pickups.push({ kind: 'item', item: items[3], x: ROOM_W / 2, y: ROOM_H / 2 - 16, r: 14, price: 0 });
    rest[0].pickups.push({ kind: 'cinder', x: ROOM_W / 2 - 28, y: ROOM_H / 2 + 28, r: 9, price: 0 });
    rest[0].pickups.push({ kind: 'cinder', x: ROOM_W / 2 + 28, y: ROOM_H / 2 + 28, r: 9, price: 0 });

    boss.enemies.push(makeEnemy('warden', ROOM_W / 2, ROOM_H / 2, floor, seq.n++));
    if (floor >= 2) {
      var side = ringPoint(rng, 1, 3);
      boss.enemies.push(makeEnemy(floor >= 3 ? 'spit' : 'mote', side.x, side.y, floor, seq.n++));
    }

    for (i = 0; i < rooms.length; i++) {
      if (rooms[i].kind !== 'combat') continue;
      var count = floor === 1 ? 2 : floor === 2 ? 3 : 4;
      var bag = floor === 1 ? ['mote', 'mote', 'spit'] : floor === 2 ? ['mote', 'spit', 'husk'] : ['husk', 'spit', 'mote', 'spit'];
      for (var k = 0; k < count; k++) {
        var p = ringPoint(rng, k, count);
        var kind = bag[Math.floor(rng.next() * bag.length)];
        rooms[i].enemies.push(makeEnemy(kind, p.x, p.y, floor, seq.n++));
      }
    }
    return rooms;
  }

  function startId(rooms) {
    for (var i = 0; i < rooms.length; i++) if (rooms[i].kind === 'start') return rooms[i].id;
    return 0;
  }

  function applyMeta(state, meta) {
    var m = meta || newMeta();
    state.maxHp = Math.min(9, 4 + (m.vial || 0));
    state.hp = state.maxHp;
    state.flares = Math.min(5, 1 + (m.flare || 0));
    state.shots = 1;
    if (m.split) state.shots = 2;
  }

  function createRun(seed, meta) {
    var s = (seed >>> 0) || 1;
    var rng = makeRng(s);
    var rooms = buildFloor(rng, 1);
    var state = {
      v: 1,
      seed: s,
      floor: 1,
      rng: rng.get(),
      status: 'play',
      time: 0,
      score: 0,
      px: ROOM_W / 2,
      py: ROOM_H / 2,
      r: PLAYER_R,
      fx: 0,
      fy: -1,
      hp: 4,
      maxHp: 4,
      iframes: 0,
      grace: 0,
      damage: 1,
      shots: 1,
      pierce: 0,
      shotCd: 0,
      shotCdMax: 0.36,
      orbit: 0,
      orbitAng: 0,
      flares: 1,
      seals: 0,
      cinders: 0,
      flareHeld: false,
      rooms: rooms,
      roomId: startId(rooms),
      bolts: [],
      toast: '',
      toastT: 0,
      shake: 0,
      denyT: 0,
      settled: false,
      events: []
    };
    applyMeta(state, meta);
    return state;
  }

  function roomAt(state) {
    return state.rooms[state.roomId];
  }

  function canLeave(room) {
    if (!room) return false;
    if ((room.kind === 'combat' || room.kind === 'boss') && !room.cleared) return false;
    return true;
  }

  function passageOpen(state, room, dir) {
    if (!room || room.links[dir] == null) return false;
    if (!canLeave(room)) return false;
    var dest = state.rooms[room.links[dir]];
    if (!dest) return false;
    if (dest.kind === 'cache' && !dest.unlocked && state.seals <= 0) return false;
    return true;
  }

  function inMouth(x, y, r, dir) {
    var half = DOOR_W / 2 + 6;
    var midX = ROOM_W / 2;
    var midY = ROOM_H / 2;
    if (dir === 'n') return Math.abs(x - midX) <= half && y < WALL + r && y > 4;
    if (dir === 's') return Math.abs(x - midX) <= half && y > ROOM_H - WALL - r && y < ROOM_H - 4;
    if (dir === 'w') return Math.abs(y - midY) <= half && x < WALL + r && x > 4;
    return Math.abs(y - midY) <= half && x > ROOM_W - WALL - r && x < ROOM_W - 4;
  }

  function crossing(x, y, dir) {
    var half = DOOR_W / 2 + 6;
    if (dir === 'n') return Math.abs(x - ROOM_W / 2) <= half && y < WALL;
    if (dir === 's') return Math.abs(x - ROOM_W / 2) <= half && y > ROOM_H - WALL;
    if (dir === 'w') return Math.abs(y - ROOM_H / 2) <= half && x < WALL;
    return Math.abs(y - ROOM_H / 2) <= half && x > ROOM_W - WALL;
  }

  function positionOk(state, room, x, y) {
    var r = state.r;
    if (x - r >= WALL && x + r <= ROOM_W - WALL && y - r >= WALL && y + r <= ROOM_H - WALL) return true;
    for (var i = 0; i < DIRS.length; i++) {
      var dir = DIRS[i];
      if (room.links[dir] != null && passageOpen(state, room, dir) && inMouth(x, y, r, dir)) return true;
    }
    return false;
  }

  function placeInDoor(state, dir) {
    if (dir === 'n') { state.px = ROOM_W / 2; state.py = WALL - 6; }
    else if (dir === 's') { state.px = ROOM_W / 2; state.py = ROOM_H - WALL + 6; }
    else if (dir === 'w') { state.px = WALL - 6; state.py = ROOM_H / 2; }
    else { state.px = ROOM_W - WALL + 6; state.py = ROOM_H / 2; }
  }

  function arrival(dir) {
    var inset = WALL + 30;
    if (dir === 'n') return { x: ROOM_W / 2, y: inset };
    if (dir === 's') return { x: ROOM_W / 2, y: ROOM_H - inset };
    if (dir === 'w') return { x: inset, y: ROOM_H / 2 };
    return { x: ROOM_W - inset, y: ROOM_H / 2 };
  }

  function enterRoom(state, id, fromDir) {
    state.roomId = id;
    state.bolts = [];
    state.grace = 0.32;
    var p = arrival(fromDir);
    state.px = p.x;
    state.py = p.y;
  }

  function roll(state) {
    var rng = makeRng(state.rng || 1);
    var v = rng.next();
    state.rng = rng.get();
    return v;
  }

  function descend(state) {
    if (state.floor >= FLOORS) {
      state.status = 'win';
      state.events.push('win');
      return;
    }
    state.floor += 1;
    state.score += 100;
    var rng = makeRng(state.rng || 1);
    state.rooms = buildFloor(rng, state.floor);
    state.rng = rng.get();
    state.roomId = startId(state.rooms);
    state.px = ROOM_W / 2;
    state.py = ROOM_H / 2;
    state.bolts = [];
    state.grace = 0.4;
    state.toast = '第 ' + state.floor + ' 层';
    state.toastT = 1.6;
    state.events.push('floor');
  }

  function hurt(state, dmg) {
    if (state.grace > 0 || state.iframes > 0 || state.status !== 'play') return;
    state.hp -= dmg;
    state.iframes = 0.72;
    state.shake = 0.18;
    state.events.push('hurt');
    if (state.hp <= 0) {
      state.hp = 0;
      state.status = 'dead';
      state.events.push('dead');
    }
  }

  function applyItem(state, id) {
    var info = ITEMS[id];
    if (!info) return '';
    if (id === 'split') state.shots = Math.min(4, state.shots + 1);
    else if (id === 'bore') state.pierce = Math.min(4, state.pierce + 1);
    else if (id === 'haste') state.shotCdMax = Math.max(0.12, +(state.shotCdMax * 0.82).toFixed(4));
    else if (id === 'halo') state.orbit = Math.min(3, state.orbit + 1);
    else if (id === 'vial') {
      state.maxHp = Math.min(9, state.maxHp + 1);
      state.hp = Math.min(state.maxHp, state.hp + 1);
    } else if (id === 'ember') state.damage = Math.min(6, state.damage + 1);
    state.toast = info.name + ' · ' + info.desc;
    state.toastT = 1.5;
    state.events.push('pickup');
    return info.name;
  }

  function fire(state) {
    var n = state.shots;
    var base = Math.atan2(state.fy, state.fx);
    var spread = 0.22;
    for (var i = 0; i < n; i++) {
      var a = n === 1 ? base : base + (i - (n - 1) / 2) * spread;
      var c = Math.cos(a);
      var s = Math.sin(a);
      state.bolts.push({
        x: state.px + c * (state.r + 6),
        y: state.py + s * (state.r + 6),
        vx: c * 340,
        vy: s * 340,
        r: 4,
        dmg: state.damage,
        hits: state.pierce + 1,
        life: 0.85,
        friendly: true,
        seen: {}
      });
    }
    state.events.push('shoot');
  }

  function pushBolt(state, x, y, vx, vy, r) {
    state.bolts.push({
      x: x, y: y, vx: vx, vy: vy, r: r || 5, dmg: 1, hits: 1, life: 2.4,
      friendly: false, seen: {}
    });
  }

  function enemyShoot(state, e) {
    var dx = state.px - e.x;
    var dy = state.py - e.y;
    var d = Math.hypot(dx, dy) || 1;
    var sp = e.kind === 'warden' ? 150 : 168;
    pushBolt(state, e.x + (dx / d) * (e.r + 4), e.y + (dy / d) * (e.r + 4), (dx / d) * sp, (dy / d) * sp, 5);
  }

  function radial(state, e) {
    var count = 8;
    e.spin += 0.35;
    for (var i = 0; i < count; i++) {
      var a = e.spin + (i / count) * Math.PI * 2;
      pushBolt(state, e.x + Math.cos(a) * (e.r + 4), e.y + Math.sin(a) * (e.r + 4), Math.cos(a) * 132, Math.sin(a) * 132, 5);
    }
  }

  function resolveDead(state, room) {
    var alive = [];
    for (var i = 0; i < room.enemies.length; i++) {
      var e = room.enemies[i];
      if (e.hp > 0) {
        alive.push(e);
        continue;
      }
      state.score += e.kind === 'warden' ? 220 : 12;
      room.pickups.push({ kind: 'cinder', x: e.x, y: e.y, r: 9, price: 0 });
      state.events.push('kill');
    }
    room.enemies = alive;
    if ((room.kind === 'combat' || room.kind === 'boss') && !room.cleared && alive.length === 0) {
      room.cleared = true;
      room.rewarded = true;
      state.events.push('clear');
      if (room.kind === 'boss') {
        state.score += 180 + state.floor * 40;
        if (state.floor >= FLOORS) {
          state.status = 'win';
          state.toast = '窑主熄灭了';
          state.toastT = 2;
          state.events.push('win');
        } else {
          room.pickups.push({ kind: 'stairs', x: ROOM_W / 2, y: ROOM_H / 2 + 36, r: 16, price: 0 });
          state.toast = '井梯开了';
          state.toastT = 1.6;
        }
      } else {
        room.pickups.push({ kind: 'cinder', x: ROOM_W / 2 - 16, y: ROOM_H / 2, r: 9, price: 0 });
        room.pickups.push({ kind: 'cinder', x: ROOM_W / 2 + 16, y: ROOM_H / 2, r: 9, price: 0 });
        var luck = roll(state);
        if (luck < 0.22) room.pickups.push({ kind: 'seal', x: ROOM_W / 2, y: ROOM_H / 2 - 28, r: 10, price: 0 });
        else if (luck < 0.4) room.pickups.push({ kind: 'vial', x: ROOM_W / 2, y: ROOM_H / 2 - 28, r: 10, price: 0 });
        else if (luck < 0.55) room.pickups.push({ kind: 'flare', x: ROOM_W / 2, y: ROOM_H / 2 - 28, r: 10, price: 0 });
      }
    }
  }

  function separate(room) {
    var list = room.enemies;
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var a = list[i];
        var b = list[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist = Math.hypot(dx, dy) || 0.001;
        var need = a.r + b.r + 2;
        if (dist < need) {
          var push = (need - dist) / 2;
          var ux = dx / dist;
          var uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }
  }

  function clampEnemy(e) {
    e.x = clamp(e.x, WALL + e.r, ROOM_W - WALL - e.r);
    e.y = clamp(e.y, WALL + e.r, ROOM_H - WALL - e.r);
  }

  function movePlayer(state, input, dt) {
    var room = roomAt(state);
    var mx = input.mx || 0;
    var my = input.my || 0;
    var mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    var nx = state.px + mx * SPEED * dt;
    var ny = state.py + my * SPEED * dt;
    if (positionOk(state, room, nx, state.py)) state.px = nx;
    if (positionOk(state, room, state.px, ny)) state.py = ny;
    if (mag > 0.2 && Math.hypot(input.ax || 0, input.ay || 0) <= 0.35) {
      state.fx = mx;
      state.fy = my;
    }
  }

  function tryTransition(state) {
    if (state.grace > 0 || state.status !== 'play') return;
    var room = roomAt(state);
    if (!canLeave(room)) return;
    for (var i = 0; i < DIRS.length; i++) {
      var dir = DIRS[i];
      var to = room.links[dir];
      if (to == null || !crossing(state.px, state.py, dir)) continue;
      if (!passageOpen(state, room, dir)) continue;
      var dest = state.rooms[to];
      if (dest.kind === 'cache' && !dest.unlocked) {
        if (state.seals <= 0) continue;
        state.seals -= 1;
        dest.unlocked = true;
        state.toast = '火印化开了库门';
        state.toastT = 1.3;
        state.events.push('unlock');
      }
      enterRoom(state, dest.id, OPP[dir]);
      return;
    }
  }

  function collect(state) {
    var room = roomAt(state);
    var keep = [];
    for (var i = 0; i < room.pickups.length; i++) {
      var p = room.pickups[i];
      var dist = Math.hypot(p.x - state.px, p.y - state.py);
      if (dist > (p.r || 12) + state.r) {
        keep.push(p);
        continue;
      }
      if (p.kind === 'item') {
        var cost = p.price || 0;
        if (cost > state.cinders) {
          keep.push(p);
          if (state.denyT <= 0) {
            state.toast = '烬不够';
            state.toastT = 0.7;
            state.denyT = 0.8;
          }
          continue;
        }
        state.cinders -= cost;
        state.score += cost;
        applyItem(state, p.item);
        continue;
      }
      if (p.kind === 'cinder') {
        state.cinders += 1;
        state.score += 5;
        state.events.push('pickup');
      } else if (p.kind === 'seal') {
        state.seals = Math.min(9, state.seals + 1);
        state.toast = '火印';
        state.toastT = 1;
        state.events.push('pickup');
      } else if (p.kind === 'flare') {
        state.flares = Math.min(5, state.flares + 1);
        state.toast = '焰弹';
        state.toastT = 1;
        state.events.push('pickup');
      } else if (p.kind === 'vial') {
        state.hp = Math.min(state.maxHp, state.hp + 1);
        state.toast = '补了一滴灯油';
        state.toastT = 1;
        state.events.push('pickup');
      } else if (p.kind === 'stairs') {
        state.events.push('stairs');
        descend(state);
        return;
      }
    }
    room.pickups = keep;
  }

  function step(state, input, dt) {
    if (!state || state.status !== 'play') return state;
    input = input || idle();
    dt = clamp(dt || 0, 0, 0.05);
    state.events = [];
    state.time += dt;
    if (state.grace > 0) state.grace -= dt;
    if (state.iframes > 0) state.iframes -= dt;
    if (state.toastT > 0) state.toastT -= dt;
    if (state.shake > 0) state.shake -= dt;
    if (state.denyT > 0) state.denyT -= dt;

    var room = roomAt(state);
    movePlayer(state, input, dt);

    if (input.flare && !state.flareHeld && state.flares > 0) {
      state.flares -= 1;
      state.iframes = Math.max(state.iframes, 0.28);
      state.shake = 0.2;
      state.events.push('flare');
      for (var f = 0; f < room.enemies.length; f++) {
        room.enemies[f].hp -= 4;
        room.enemies[f].hurt = 0.16;
      }
      state.bolts = state.bolts.filter(function (b) { return b.friendly; });
    }
    state.flareHeld = !!input.flare;

    var ax = input.ax || 0;
    var ay = input.ay || 0;
    var am = Math.hypot(ax, ay);
    if (am > 0.35) {
      state.fx = ax / am;
      state.fy = ay / am;
      state.shotCd -= dt;
      if (state.shotCd <= 0) {
        fire(state);
        state.shotCd = state.shotCdMax;
      }
    }

    for (var i = 0; i < room.enemies.length; i++) {
      var e = room.enemies[i];
      if (e.hp <= 0) continue;
      if (e.hurt > 0) e.hurt -= dt;
      var dx = state.px - e.x;
      var dy = state.py - e.y;
      var dist = Math.hypot(dx, dy) || 1;
      var ux = dx / dist;
      var uy = dy / dist;
      if (e.kind === 'spit' && dist < 108) { ux = -ux; uy = -uy; }
      else if (e.kind === 'spit' && dist < 150) { ux = 0; uy = 0; }
      e.x += ux * e.speed * dt;
      e.y += uy * e.speed * dt;
      if (e.kind === 'spit' || e.kind === 'warden') {
        e.cd -= dt;
        if (e.cd <= 0) {
          if (e.kind === 'warden') radial(state, e);
          else enemyShoot(state, e);
          e.cd = e.kind === 'warden' ? Math.max(0.85, 1.45 - state.floor * 0.12) : 1.25;
        }
      }
    }
    separate(room);
    for (i = 0; i < room.enemies.length; i++) clampEnemy(room.enemies[i]);

    var nextBolts = [];
    for (i = 0; i < state.bolts.length; i++) {
      var b = state.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) continue;
      if (b.x < -20 || b.y < -20 || b.x > ROOM_W + 20 || b.y > ROOM_H + 20) continue;
      if (b.friendly) {
        var hit = false;
        for (var k = 0; k < room.enemies.length; k++) {
          var foe = room.enemies[k];
          if (foe.hp <= 0 || b.seen[foe.id]) continue;
          if (Math.hypot(foe.x - b.x, foe.y - b.y) <= foe.r + b.r) {
            foe.hp -= b.dmg;
            foe.hurt = 0.12;
            b.seen[foe.id] = 1;
            b.hits -= 1;
            hit = true;
            state.events.push('hit');
            if (b.hits <= 0) break;
          }
        }
        if (hit && b.hits <= 0) continue;
      } else if (Math.hypot(state.px - b.x, state.py - b.y) <= state.r + b.r) {
        hurt(state, b.dmg);
        continue;
      }
      nextBolts.push(b);
    }
    state.bolts = nextBolts.length > 96 ? nextBolts.slice(nextBolts.length - 96) : nextBolts;

    if (state.orbit > 0) {
      state.orbitAng += dt * 4.2;
      var ox = state.px + Math.cos(state.orbitAng) * 28;
      var oy = state.py + Math.sin(state.orbitAng) * 28;
      state.orbitX = ox;
      state.orbitY = oy;
      for (i = 0; i < room.enemies.length; i++) {
        var orb = room.enemies[i];
        if (orb.orbitCd > 0) orb.orbitCd -= dt;
        if (orb.hp > 0 && orb.orbitCd <= 0 && Math.hypot(orb.x - ox, orb.y - oy) < orb.r + 8) {
          orb.hp -= state.orbit;
          orb.hurt = 0.1;
          orb.orbitCd = 0.35;
          state.events.push('hit');
        }
      }
    }

    if (state.status === 'play') {
      for (i = 0; i < room.enemies.length; i++) {
        var body = room.enemies[i];
        if (body.hp > 0 && Math.hypot(body.x - state.px, body.y - state.py) < body.r + state.r - 1) {
          hurt(state, 1);
          break;
        }
      }
    }

    resolveDead(state, roomAt(state));
    if (state.status !== 'play') return state;
    collect(state);
    if (state.status !== 'play') return state;
    tryTransition(state);
    return state;
  }

  function settle(state, meta) {
    if (!state || state.settled) return 0;
    state.settled = true;
    var gained = state.floor * 2 + Math.floor((state.cinders || 0) / 5) + (state.status === 'win' ? 8 : 0);
    meta.ash = (meta.ash || 0) + gained;
    if ((state.score || 0) > (meta.best || 0)) meta.best = state.score;
    return gained;
  }

  function revive(state) {
    if (!state || state.status !== 'dead' || state.revived) return false;
    state.revived = true;
    state.status = 'play';
    state.hp = state.maxHp;
    state.iframes = 2;
    state.bolts = [];
    state.toast = '灯又亮了';
    state.toastT = 1.4;
    return true;
  }

  function snapshot(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function restore(data) {
    if (!data || data.v !== 1 || data.status !== 'play') return null;
    if (!Array.isArray(data.rooms) || data.rooms.length !== 9) return null;
    if (typeof data.px !== 'number' || typeof data.hp !== 'number' || typeof data.floor !== 'number') return null;
    if (!data.rooms[data.roomId]) return null;
    data.events = [];
    return data;
  }

  function itemName(id) {
    return ITEMS[id] ? ITEMS[id].name : '';
  }

  function itemDesc(id) {
    return ITEMS[id] ? ITEMS[id].desc : '';
  }

  return {
    ROOM_W: ROOM_W,
    ROOM_H: ROOM_H,
    WALL: WALL,
    FLOORS: FLOORS,
    SHOP: SHOP,
    createRun: createRun,
    step: step,
    newMeta: newMeta,
    buy: buy,
    price: price,
    settle: settle,
    revive: revive,
    snapshot: snapshot,
    restore: restore,
    passageOpen: passageOpen,
    placeInDoor: placeInDoor,
    idle: idle,
    makeEnemy: makeEnemy,
    itemName: itemName,
    itemDesc: itemDesc,
    applyItem: applyItem
  };
});
