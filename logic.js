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
    ember: { name: '炽芯', desc: '伤害 +1' },
    mantle: { name: '灰氅', desc: '走得更快' },
    wick: { name: '回芯', desc: '清房回复灯油' },
    brand: { name: '烙印', desc: '火花会灼烧' },
    shell: { name: '灯壳', desc: '每间房挡一次' },
    spur: { name: '疾芯', desc: '冲刺回得更快' },
    lens: { name: '聚灯', desc: '更容易打出暴击' },
    cask: { name: '爆芯', desc: '焰弹更狠' }
  };

  var TALENTS = {
    pulse: { name: '脉火', desc: '伤害 +1' },
    lamp: { name: '厚油', desc: '灯油上限 +1' },
    glean: { name: '拾烬', desc: '清房多一枚烬' },
    sprint: { name: '踏焰', desc: '冲刺更快' },
    ward: { name: '守夜', desc: '每间房多挡一次' },
    aispark: { name: '芯火·AI 强化', desc: '芯火伤害 +1，射得更快' }
  };
  var TALENT_KEYS = ['pulse', 'lamp', 'glean', 'sprint', 'ward'];
  var WEAPONS = {
    spark: { name: '芯火', desc: '又快又直' },
    lance: { name: '烬矛', desc: '慢，远，能穿透' },
    fan: { name: '扇烬', desc: '近处撒开一片' },
    loop: { name: '回灯', desc: '飞出后会飞回' }
  };
  var WEAPON_KEYS = ['spark', 'lance', 'fan', 'loop'];
  var ROOM_LABEL = { tide: '怪物潮', gift: '福利房 · 选一把武器', talent: '天赋', wager: '赌桌' };

  var LAWS = {
    nest: '虫巢 · 多一只漂烬',
    glass: '脆窑 · 敌人更脆更快',
    vein: '矿脉 · 有烬，还有会炸的灯桶',
    duel: '单挑 · 一个更硬的敌人',
    wave: '余潮 · 清完还会再来一波'
  };

  var PACTS = {
    thirst: '渴井 · 捡到的烬算两份',
    leech: '噬灯 · 击杀回一滴灯油',
    hunter: '猎火 · 伤害 +1',
    steady: '稳芯 · 进房多挡一会儿'
  };

  var FLOOR_NAME = { 1: '灰廊', 2: '裂窑', 3: '窑心' };
  var FLOOR_SETS = [
    ['灰廊', '裂窑', '窑心'],
    ['沉廊', '熔缝', '炉心'],
    ['黑井', '焦室', '芯渊'],
    ['空窑', '星烬', '底火']
  ];
  var BOSS_CYCLE = ['warden', 'smith', 'queen', 'king'];
  var BOSS_NAME = { warden: '窑主', smith: '钟匠', queen: '蛾后', king: '烬王' };
  var BOSS_PHASE = { warden: '窑主裂开了', smith: '钟匠敲裂了', queen: '蛾后散开了', king: '烬王烧起来了' };
  var ITEM_POOL = ['split', 'bore', 'haste', 'halo', 'vial', 'ember', 'mantle', 'wick', 'brand', 'shell', 'spur', 'lens', 'cask'];

  var SHOP = [
    { key: 'vial', name: '备用灯油', max: 3, cost: 6, desc: '开局灯油上限 +1' },
    { key: 'flare', name: '焰弹袋', max: 2, cost: 8, desc: '开局焰弹 +1' },
    { key: 'split', name: '双焰灯芯', max: 1, cost: 12, desc: '开局多一发火花' }
  ];

  var OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
  var DIRS = ['n', 'e', 's', 'w'];
  var STEP = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

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

  function grantCursor(meta) {
    if (!meta || meta.cursor) return false;
    meta.cursor = 1;
    meta.ash = (meta.ash || 0) + 500;
    return true;
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
      ash: { hp: 6, r: 13, speed: 28, cd: 0.4 },
      moth: { hp: 3, r: 10, speed: 70, cd: 0.9 },
      bell: { hp: 8, r: 15, speed: 24, cd: 1.15 },
      warden: { hp: 34, r: 24, speed: 42, cd: 1.35 },
      smith: { hp: 46, r: 26, speed: 24, cd: 1.5 },
      queen: { hp: 32, r: 22, speed: 64, cd: 1.05 },
      king: { hp: 52, r: 23, speed: 34, cd: 0.85 }
    };
    var t = table[kind] || table.mote;
    var depth = Math.max(0, (floor || 1) - 1);
    var extra = isBossKind(kind)
      ? Math.round((floor || 1) * 8 + Math.floor(depth / 3) * 18)
      : depth + Math.floor(depth / 3) * 2;
    var hp = t.hp + extra;
    var speed = t.speed;
    if (!isBossKind(kind) && depth > 0) speed = Math.round(speed * (1 + Math.min(0.45, depth * 0.035)));
    return {
      id: id, kind: kind, x: x, y: y, r: t.r, hp: hp, maxHp: hp,
      speed: speed, cd: t.cd, hurt: 0, orbitCd: 0, spin: 0,
      dash: 0, wind: 0, dx: 0, dy: 0, phased: false,
      burn: 0, burnDmg: 0, burnTick: 0,
      hx: x, hy: y, elite: false, trait: '', baby: 0, shield: 0
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
    var pool = ITEM_POOL.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(rng.next() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, n);
  }

  function pickTalents(rng, n) {
    var pool = TALENT_KEYS.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(rng.next() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, n);
  }

  function pickWeapons(rng, n) {
    var pool = WEAPON_KEYS.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(rng.next() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, n);
  }

  function blankRoom(id, x, y) {
    return {
      id: id, gx: x, gy: y, kind: 'combat',
      links: { n: null, e: null, s: null, w: null },
      cleared: false, unlocked: false, seen: false, enemies: [], pickups: [], hazards: [], rewarded: false
    };
  }

  function linkRooms(a, b, dir) {
    a.links[dir] = b.id;
    b.links[OPP[dir]] = a.id;
  }

  function hasOtherExit(rooms, room) {
    for (var i = 0; i < DIRS.length; i++) {
      var id = room.links[DIRS[i]];
      if (id != null && rooms[id].kind !== 'cache') return true;
    }
    return false;
  }

  function carveRooms(rng) {
    var rooms = [];
    var at = {};
    function key(x, y) { return x + ',' + y; }
    var start = blankRoom(0, 0, 0);
    rooms.push(start);
    at[key(0, 0)] = start;
    var guard = 0;
    while (rooms.length < 12 && guard < 80) {
      guard += 1;
      var options = [];
      var i, d, dir, nx, ny;
      for (i = 0; i < rooms.length; i++) {
        for (d = 0; d < DIRS.length; d++) {
          dir = DIRS[d];
          if (rooms[i].links[dir] != null) continue;
          nx = rooms[i].gx + STEP[dir][0];
          ny = rooms[i].gy + STEP[dir][1];
          if (at[key(nx, ny)]) continue;
          options.push({ room: rooms[i], dir: dir, x: nx, y: ny });
        }
      }
      if (!options.length) break;
      var newest = [];
      var tail = rooms[rooms.length - 1];
      for (i = 0; i < options.length; i++) if (options[i].room === tail) newest.push(options[i]);
      var pick = newest.length && rng.next() < 0.66
        ? newest[Math.floor(rng.next() * newest.length)]
        : options[Math.floor(rng.next() * options.length)];
      var born = blankRoom(rooms.length, pick.x, pick.y);
      rooms.push(born);
      at[key(pick.x, pick.y)] = born;
      linkRooms(pick.room, born, pick.dir);
    }
    var extras = [];
    for (i = 0; i < rooms.length; i++) {
      for (d = 0; d < DIRS.length; d++) {
        dir = DIRS[d];
        if (rooms[i].links[dir] != null) continue;
        nx = rooms[i].gx + STEP[dir][0];
        ny = rooms[i].gy + STEP[dir][1];
        var other = at[key(nx, ny)];
        if (!other || rooms[i].id > other.id) continue;
        extras.push({ room: rooms[i], other: other, dir: dir });
      }
    }
    for (var e = extras.length - 1; e > 0; e--) {
      var j = Math.floor(rng.next() * (e + 1));
      var tmp = extras[e]; extras[e] = extras[j]; extras[j] = tmp;
    }
    var loops = 1 + Math.floor(rng.next() * 3);
    for (e = 0; e < loops && e < extras.length; e++) linkRooms(extras[e].room, extras[e].other, extras[e].dir);
    var minX = 0;
    var minY = 0;
    for (i = 0; i < rooms.length; i++) {
      if (rooms[i].gx < minX) minX = rooms[i].gx;
      if (rooms[i].gy < minY) minY = rooms[i].gy;
    }
    for (i = 0; i < rooms.length; i++) {
      rooms[i].gx -= minX;
      rooms[i].gy -= minY;
    }
    return rooms;
  }

  function farthestRoom(rooms, origin, rng) {
    var dist = {};
    var queue = [origin.id];
    dist[origin.id] = 0;
    var best = 0;
    var far = [];
    while (queue.length) {
      var id = queue.shift();
      var room = rooms[id];
      if (room !== origin && dist[id] > best) {
        best = dist[id];
        far = [room];
      } else if (room !== origin && dist[id] === best) far.push(room);
      for (var i = 0; i < DIRS.length; i++) {
        var next = room.links[DIRS[i]];
        if (next == null || dist[next] != null) continue;
        dist[next] = dist[id] + 1;
        queue.push(next);
      }
    }
    if (!far.length) return rooms[rooms.length - 1];
    return far[Math.floor(rng.next() * far.length)];
  }

  function buildFloor(rng, floor) {
    var rooms = carveRooms(rng);
    var start = rooms[0];
    start.kind = 'start';
    start.cleared = true;
    start.seen = true;
    start.pickups.push({ kind: 'seal', x: ROOM_W / 2, y: ROOM_H / 2 + 54, r: 10, price: 0 });
    var boss = farthestRoom(rooms, start, rng);
    boss.kind = 'boss';
    var rest = [];
    var i;
    for (i = 0; i < rooms.length; i++) {
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
    rest[3].kind = 'trial';
    if (!hasOtherExit(rooms, rest[3])) {
      for (i = 4; i < rest.length; i++) {
        if (!hasOtherExit(rooms, rest[i])) continue;
        rest[3].kind = 'combat';
        rest[i].kind = 'trial';
        tmp = rest[3];
        rest[3] = rest[i];
        rest[i] = tmp;
        break;
      }
    }
    if (!hasOtherExit(rooms, rest[3])) {
      for (i = 0; i < rooms.length && !hasOtherExit(rooms, rest[3]); i++) {
        var other = rooms[i];
        if (other === rest[3] || other.kind === 'cache') continue;
        for (var d = 0; d < DIRS.length; d++) {
          if (rest[3].links[DIRS[d]] != null || other.links[OPP[DIRS[d]]] != null) continue;
          linkRooms(rest[3], other, DIRS[d]);
          break;
        }
      }
    }
    rest[4].kind = 'tide';
    rest[5].kind = 'gift';
    rest[5].cleared = true;
    rest[6].kind = 'talent';
    rest[6].cleared = true;
    rest[7].kind = 'wager';
    rest[7].cleared = true;

    var seq = { n: 1 };
    var items = pickItems(rng, 5);
    rest[1].pickups.push({ kind: 'item', item: items[0], x: ROOM_W / 2 - 36, y: ROOM_H / 2, r: 14, price: 0, choice: 1 });
    rest[1].pickups.push({ kind: 'item', item: items[4], x: ROOM_W / 2 + 36, y: ROOM_H / 2, r: 14, price: 0, choice: 1 });
    rest[2].pickups.push({ kind: 'item', item: items[1], x: ROOM_W / 2 - 48, y: ROOM_H / 2, r: 14, price: 8 + floor * 2 });
    rest[2].pickups.push({ kind: 'item', item: items[2], x: ROOM_W / 2 + 48, y: ROOM_H / 2, r: 14, price: 12 + floor * 2 });
    rest[0].pickups.push({ kind: 'item', item: items[3], x: ROOM_W / 2, y: ROOM_H / 2 - 16, r: 14, price: 0 });
    rest[0].pickups.push({ kind: 'seal', x: ROOM_W / 2 + 40, y: ROOM_H / 2 - 16, r: 10, price: 0 });
    rest[0].pickups.push({ kind: 'cinder', x: ROOM_W / 2 - 28, y: ROOM_H / 2 + 28, r: 9, price: 0 });
    rest[0].pickups.push({ kind: 'cinder', x: ROOM_W / 2 + 28, y: ROOM_H / 2 + 28, r: 9, price: 0 });
    rest[2].pickups.push({ kind: 'flare', x: ROOM_W / 2, y: ROOM_H / 2 + 52, r: 10, price: 4 + floor });
    if (rest[2].pickups[0] && rest[2].pickups[0].price > 1) {
      rest[2].pickups[0].price = Math.max(1, rest[2].pickups[0].price - 3);
      rest[2].pickups[0].sale = 1;
    }
    var talents = pickTalents(rng, 3);
    rest[6].pickups.push({ kind: 'talent', talent: talents[0], x: ROOM_W / 2 - 72, y: ROOM_H / 2, r: 14, price: 0, choice: 1 });
    rest[6].pickups.push({ kind: 'talent', talent: talents[1], x: ROOM_W / 2, y: ROOM_H / 2, r: 14, price: 0, choice: 1 });
    rest[6].pickups.push({ kind: 'talent', talent: talents[2], x: ROOM_W / 2 + 72, y: ROOM_H / 2, r: 14, price: 0, choice: 1 });
    rest[5].pickups.push({ kind: 'cinder', x: ROOM_W / 2 - 48, y: ROOM_H / 2 - 20, r: 9, price: 0 });
    rest[5].pickups.push({ kind: 'cinder', x: ROOM_W / 2, y: ROOM_H / 2 - 36, r: 9, price: 0 });
    rest[5].pickups.push({ kind: 'cinder', x: ROOM_W / 2 + 48, y: ROOM_H / 2 - 20, r: 9, price: 0 });
    rest[5].pickups.push({ kind: 'cinder', x: ROOM_W / 2, y: ROOM_H / 2 + 28, r: 9, price: 0 });
    rest[5].pickups.push({ kind: 'vial', x: ROOM_W / 2 - 36, y: ROOM_H / 2 + 64, r: 12, price: 0 });
    rest[5].pickups.push({ kind: 'flare', x: ROOM_W / 2 + 36, y: ROOM_H / 2 + 64, r: 12, price: 0 });
    var arms = pickWeapons(rng, 2);
    rest[5].pickups.push({ kind: 'weapon', weapon: arms[0], x: ROOM_W / 2 - 72, y: ROOM_H / 2 - 92, r: 14, price: 0, choice: 1 });
    rest[5].pickups.push({ kind: 'weapon', weapon: arms[1], x: ROOM_W / 2 + 72, y: ROOM_H / 2 - 92, r: 14, price: 0, choice: 1 });
    rest[7].pickups.push({ kind: 'wager', x: ROOM_W / 2, y: ROOM_H / 2, r: 16, price: 0 });

    boss.bossKind = bossForm(floor);
    boss.enemies.push(makeEnemy(boss.bossKind, ROOM_W / 2, ROOM_H / 2, floor, seq.n++));
    if (floor >= 2) {
      var side = ringPoint(rng, 1, 3);
      var buddy = floor >= 8 ? 'husk' : floor >= 5 ? 'bell' : floor >= 3 ? 'spit' : 'mote';
      boss.enemies.push(makeEnemy(buddy, side.x, side.y, floor, seq.n++));
    }
    if (floor >= 6) {
      var side2 = ringPoint(rng, 2, 4);
      boss.enemies.push(makeEnemy('ash', side2.x, side2.y, floor, seq.n++));
    }

    for (i = 0; i < rooms.length; i++) {
      if (rooms[i].kind === 'tide') {
        rooms[i].wave = 2;
        for (var t = 0; t < 3; t++) {
          var tideAt = ringPoint(rng, t, 3);
          rooms[i].enemies.push(makeEnemy(t === 2 ? 'moth' : 'mote', tideAt.x, tideAt.y, floor, seq.n++));
        }
        continue;
      }
      if (rooms[i].kind !== 'combat' && rooms[i].kind !== 'trial') continue;
      var count = floor <= 1 ? 2 : floor === 2 ? 3 : Math.min(6, 4 + Math.floor((floor - 3) / 3));
      if (rooms[i].kind === 'trial') count += 1;
      var bag = floor === 1 ? ['mote', 'mote', 'spit', 'moth', 'bell'] : floor === 2 ? ['mote', 'spit', 'husk', 'ash', 'moth', 'bell'] : ['husk', 'spit', 'ash', 'ash', 'bell', 'moth'];
      if (rooms[i].kind === 'trial' && floor === 1) bag = ['mote', 'spit', 'husk'];
      for (var k = 0; k < count; k++) {
        var p = ringPoint(rng, k, count);
        var kind = bag[Math.floor(rng.next() * bag.length)];
        rooms[i].enemies.push(makeEnemy(kind, p.x, p.y, floor, seq.n++));
      }
      if (rooms[i].kind === 'trial' || floor >= 2) {
        var cracks = floor <= 1 ? 1 : floor === 2 ? 2 : Math.min(5, 2 + Math.floor((floor - 1) / 2));
        for (k = 0; k < cracks; k++) {
          var crack = ringPoint(rng, k + 1, cracks + 2);
          rooms[i].hazards.push({ x: crack.x, y: crack.y, r: 16 });
        }
      }
    }
    applyLaws(rng, rooms, floor);
    return rooms;
  }

  function applyLaws(rng, rooms, floor) {
    var names = ['nest', 'glass', 'vein', 'duel', 'wave'];
    var eliteGiven = false;
    for (var i = 0; i < rooms.length; i++) {
      var room = rooms[i];
      if (room.kind !== 'combat') continue;
      var law = names[Math.floor(rng.next() * names.length)];
      room.law = law;
      if (law === 'nest') {
        var spot = ringPoint(rng, 4, 6);
        room.enemies.push(makeEnemy('mote', spot.x, spot.y, floor, 1000 + room.id));
      } else if (law === 'glass') {
        for (var g = 0; g < room.enemies.length; g++) {
          room.enemies[g].hp = Math.max(1, Math.round(room.enemies[g].hp * 0.6));
          room.enemies[g].maxHp = room.enemies[g].hp;
          room.enemies[g].speed = Math.round(room.enemies[g].speed * 1.35);
        }
      } else if (law === 'vein') {
        room.pickups.push({ kind: 'cinder', x: ROOM_W / 2 - 46, y: ROOM_H / 2 + 78, r: 9, price: 0 });
        room.pickups.push({ kind: 'cinder', x: ROOM_W / 2 + 46, y: ROOM_H / 2 + 78, r: 9, price: 0 });
        room.barrels = [{ x: ROOM_W / 2, y: ROOM_H / 2 - 8, r: 14, hp: 2 }];
      } else if (law === 'duel' && room.enemies.length) {
        var keep = room.enemies[0];
        for (var d = 1; d < room.enemies.length; d++) if (room.enemies[d].hp > keep.hp) keep = room.enemies[d];
        keep.hp = Math.round(keep.hp * 1.85);
        keep.maxHp = keep.hp;
        keep.elite = true;
        keep.trait = 'split';
        room.enemies = [keep];
        eliteGiven = true;
      } else if (law === 'wave') room.wave = 1;
      if (!eliteGiven && room.enemies.length) {
        var lead = room.enemies[0];
        lead.elite = true;
        lead.trait = rng.next() < 0.5 ? 'split' : 'armored';
        if (lead.trait === 'armored') lead.shield = 1;
        eliteGiven = true;
      }
    }
  }

  function startId(rooms) {
    for (var i = 0; i < rooms.length; i++) if (rooms[i].kind === 'start') return rooms[i].id;
    return 0;
  }

  function applyMeta(state, meta) {
    var m = meta || newMeta();
    state.maxHp = Math.min(9, 4 + (m.vial || 0));
    state.hp = state.maxHp;
    state.flares = Math.min(5, 1 + (m.flare || 0) + (m.badge ? 1 : 0));
    state.shots = 1;
    if (m.cursor) {
      state.aiSpark = 1;
      if (!state.gear) state.gear = [];
      state.gear.push('aispark');
    }
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
      weapon: 'spark',
      shots: 1,
      pierce: 0,
      shotCd: 0,
      shotCdMax: 0.36,
      orbit: 0,
      orbitAng: 0,
      flares: 1,
      seals: 0,
      cinders: 0,
      speed: 1,
      wicks: 0,
      brand: 0,
      shell: 0,
      guard: 0,
      chain: 0,
      chainT: 0,
      revived: false,
      gear: [],
      flareHeld: false,
      pact: '',
      spur: 0,
      lens: 0,
      cask: 0,
      dashT: 0,
      dashCd: 0,
      dashHeld: false,
      dashX: 0,
      dashY: -1,
      pops: [],
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
    applyPact(state);
    return state;
  }

  function roomAt(state) {
    return state.rooms[state.roomId];
  }

  function canLeave(room) {
    if (!room) return false;
    if ((room.kind === 'combat' || room.kind === 'boss' || room.kind === 'trial' || room.kind === 'tide') && !room.cleared) return false;
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
    var entered = state.rooms[id];
    if (entered) entered.seen = true;
    state.bolts = [];
    state.grace = state.pact === 'steady' ? 0.62 : 0.32;
    state.guard = state.shell || 0;
    state.chain = 0;
    state.chainT = 0;
    var p = arrival(fromDir);
    state.px = p.x;
    state.py = p.y;
    if (entered && entered.law && !entered.told) {
      entered.told = true;
      state.toast = lawName(entered.law);
      state.toastT = 1.5;
      state.events.push('law');
    } else if (entered && ROOM_LABEL[entered.kind] && !entered.told) {
      entered.told = true;
      state.toast = ROOM_LABEL[entered.kind];
      state.toastT = 1.5;
      state.events.push('law');
    } else if (entered && entered.kind === 'boss' && !entered.told) {
      entered.told = true;
      var lead = entered.enemies && entered.enemies[0];
      state.toast = bossName(entered.bossKind || (lead && lead.kind));
      state.toastT = 1.4;
    }
  }

  function roll(state) {
    var rng = makeRng(state.rng || 1);
    var v = rng.next();
    state.rng = rng.get();
    return v;
  }

  function descend(state) {
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
    state.guard = state.shell || 0;
    state.chain = 0;
    state.chainT = 0;
    applyPact(state);
    state.toast = floorName(state.floor) + ' · ' + pactName(state.pact);
    state.toastT = 1.8;
    state.events.push('floor');
  }

  function hurt(state, dmg) {
    if (state.grace > 0 || state.iframes > 0 || state.status !== 'play') return false;
    if ((state.guard || 0) > 0) {
      state.guard -= 1;
      state.iframes = 0.45;
      state.toast = '灯壳挡住了';
      state.toastT = 0.8;
      state.events.push('guard');
      return false;
    }
    state.hp -= dmg;
    state.iframes = 0.72;
    state.shake = 0.18;
    state.events.push('hurt');
    if (state.hp <= 0) {
      state.hp = 0;
      state.status = 'dead';
      state.events.push('dead');
    }
    return true;
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
    else if (id === 'mantle') state.speed = Math.min(1.48, Math.round(((state.speed || 1) + 0.12) * 1000) / 1000);
    else if (id === 'wick') state.wicks = Math.min(3, (state.wicks || 0) + 1);
    else if (id === 'brand') state.brand = Math.min(3, (state.brand || 0) + 1);
    else if (id === 'shell') {
      state.shell = Math.min(2, (state.shell || 0) + 1);
      state.guard = state.shell;
    } else if (id === 'spur') state.spur = Math.min(3, (state.spur || 0) + 1);
    else if (id === 'lens') state.lens = Math.min(3, (state.lens || 0) + 1);
    else if (id === 'cask') state.cask = Math.min(2, (state.cask || 0) + 1);
    if (!state.gear) state.gear = [];
    state.gear.push(id);
    state.toast = info.name + ' · ' + info.desc;
    state.toastT = 1.5;
    state.events.push('pickup');
    return info.name;
  }

  function applyTalent(state, id) {
    var info = TALENTS[id];
    if (!info) return '';
    if (id === 'pulse') state.damage = Math.min(6, (state.damage || 1) + 1);
    else if (id === 'lamp') {
      state.maxHp = Math.min(9, state.maxHp + 1);
      state.hp = Math.min(state.maxHp, state.hp + 1);
    } else if (id === 'glean') state.glean = Math.min(3, (state.glean || 0) + 1);
    else if (id === 'sprint') state.spur = Math.min(3, (state.spur || 0) + 1);
    else if (id === 'ward') {
      state.shell = Math.min(2, (state.shell || 0) + 1);
      state.guard = state.shell;
    }
    if (!state.gear) state.gear = [];
    state.gear.push(id);
    state.toast = info.name + ' · ' + info.desc;
    state.toastT = 1.5;
    state.events.push('pickup');
    return info.name;
  }

  function pushShot(state, angle, speed, radius, dmg, hits, life, mode) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    state.bolts.push({
      x: state.px + c * (state.r + 6),
      y: state.py + s * (state.r + 6),
      vx: c * speed,
      vy: s * speed,
      r: radius,
      dmg: dmg,
      hits: hits,
      life: life,
      friendly: true,
      seen: {},
      mode: mode || 'spark',
      age: 0,
      back: 0
    });
  }

  function fire(state) {
    var kind = WEAPONS[state.weapon] ? state.weapon : 'spark';
    var n = state.shots || 1;
    var base = Math.atan2(state.fy, state.fx);
    var i;
    if (kind === 'lance') {
      for (i = 0; i < n; i++) {
        var la = n === 1 ? base : base + (i - (n - 1) / 2) * 0.08;
        pushShot(state, la, 470, 6, state.damage + 1, state.pierce + 3, 0.62, 'lance');
      }
    } else if (kind === 'fan') {
      var fanN = n + 3;
      for (i = 0; i < fanN; i++) {
        pushShot(state, base + (i - (fanN - 1) / 2) * 0.34, 250, 3, state.damage, state.pierce + 1, 0.36, 'fan');
      }
    } else if (kind === 'loop') {
      for (i = 0; i < n; i++) {
        var oa = n === 1 ? base : base + (i - (n - 1) / 2) * 0.2;
        pushShot(state, oa, 240, 5, state.damage, state.pierce + 1, 1.25, 'loop');
      }
    } else {
      var spread = 0.22;
      for (i = 0; i < n; i++) {
        var a = n === 1 ? base : base + (i - (n - 1) / 2) * spread;
        pushShot(state, a, 340, 4, state.damage + (state.aiSpark ? 1 : 0), state.pierce + 1, 0.85, 'spark');
      }
    }
    state.events.push('shoot');
  }

  function weaponCd(state) {
    var kind = state.weapon;
    var mul = kind === 'lance' ? 1.85 : kind === 'fan' ? 1.22 : kind === 'loop' ? 1.4 : 1;
    if (state.aiSpark && (kind === 'spark' || !WEAPONS[kind])) mul *= 0.82;
    return state.shotCdMax * mul;
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

  function radial(state, e, count, speed) {
    count = count || 8;
    speed = speed || 132;
    e.spin += 0.35;
    for (var i = 0; i < count; i++) {
      var a = e.spin + (i / count) * Math.PI * 2;
      pushBolt(state, e.x + Math.cos(a) * (e.r + 4), e.y + Math.sin(a) * (e.r + 4), Math.cos(a) * speed, Math.sin(a) * speed, 5);
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
      state.score += isBossKind(e.kind) ? 220 + Math.floor((state.floor || 1) / 3) * 40 : 12;
      room.pickups.push({ kind: 'cinder', x: e.x, y: e.y, r: 9, price: 0 });
      if ((state.chain || 0) > 0) state.chain += 1;
      else state.chain = 1;
      state.chainT = 1.15;
      if (state.chain >= 2) {
        room.pickups.push({ kind: 'cinder', x: e.x + 14, y: e.y - 8, r: 9, price: 0 });
        state.events.push('chain');
        if (state.chain === 2) {
          state.toast = '连烬';
          state.toastT = 0.8;
        }
      }
      if (e.kind === 'husk') {
        for (var n = 0; n < 6; n++) {
          var a = (n / 6) * Math.PI * 2;
          pushBolt(state, e.x, e.y, Math.cos(a) * 96, Math.sin(a) * 96, 4);
        }
      }
      if (e.trait === 'split' && !e.baby) {
        var baby = makeEnemy('mote', e.x + 18, e.y + 8, state.floor || 1, (e.id || 1) + 900);
        baby.hp = 2;
        baby.maxHp = 2;
        baby.baby = 1;
        baby.speed = 96;
        alive.push(baby);
        state.events.push('split');
      }
      if (state.pact === 'leech' && state.hp > 0 && state.hp < state.maxHp) {
        state.hp += 1;
        state.pops.push({ x: state.px, y: state.py - 22, text: '+油', kind: 'heal' });
      }
      state.pops.push({ x: e.x, y: e.y - 26, text: e.elite ? '击破' : '×', kind: 'kill' });
      state.events.push('kill');
    }
    if (alive.length === 0 && room.wave > 0 && !room.cleared && (room.kind === 'combat' || room.kind === 'tide')) {
      room.wave -= 1;
      var waveN = room.kind === 'tide' ? 3 : 2;
      var spots = waveN === 3
        ? [[ROOM_W / 2 - 70, ROOM_H / 2], [ROOM_W / 2 + 70, ROOM_H / 2], [ROOM_W / 2, ROOM_H / 2 - 64]]
        : [[ROOM_W / 2 - 64, ROOM_H / 2], [ROOM_W / 2 + 64, ROOM_H / 2]];
      for (var w = 0; w < waveN; w++) {
        var waveKind = room.kind === 'tide' && w === 2 ? 'spit' : (w % 2 ? 'moth' : 'mote');
        alive.push(makeEnemy(waveKind, spots[w][0], spots[w][1], state.floor || 1, 700 + room.id * 10 + w + room.wave * 5));
      }
      state.toast = room.kind === 'tide' ? '怪物潮又来了' : '余潮又来了';
      state.toastT = 1.1;
      state.events.push('wave');
    }
    room.enemies = alive;
    if ((room.kind === 'combat' || room.kind === 'boss' || room.kind === 'trial' || room.kind === 'tide') && !room.cleared && alive.length === 0) {
      room.cleared = true;
      room.rewarded = true;
      state.events.push('clear');
      if (room.kind === 'boss') {
        state.score += 180 + state.floor * 40;
        if (state.status === 'play' && state.wicks > 0 && state.hp > 0 && state.hp < state.maxHp) {
          state.hp = Math.min(state.maxHp, state.hp + state.wicks);
        }
        if (state.floor >= 1) {
          room.pickups.push({ kind: 'stairs', x: ROOM_W / 2, y: ROOM_H / 2 + 36, r: 16, price: 0 });
          state.toast = bossName(room.bossKind) + '熄了，井梯开了';
          state.toastT = 1.6;
        }
      } else {
        room.pickups.push({ kind: 'cinder', x: ROOM_W / 2 - 16, y: ROOM_H / 2, r: 9, price: 0 });
        room.pickups.push({ kind: 'cinder', x: ROOM_W / 2 + 16, y: ROOM_H / 2, r: 9, price: 0 });
        if (state.glean) room.pickups.push({ kind: 'cinder', x: ROOM_W / 2, y: ROOM_H / 2 + 36, r: 9, price: 0 });
        if (state.status === 'play' && state.wicks > 0 && state.hp > 0 && state.hp < state.maxHp) {
          state.hp = Math.min(state.maxHp, state.hp + state.wicks);
          state.toast = '回芯暖了一下';
          state.toastT = 1.1;
        }
        if (room.kind === 'tide') {
          room.pickups.push({ kind: 'flare', x: ROOM_W / 2, y: ROOM_H / 2 - 48, r: 12, price: 0 });
          state.toast = '潮退了';
          state.toastT = 1.4;
        } else if (room.kind === 'trial') {
          var prize = ITEM_POOL[Math.floor(roll(state) * ITEM_POOL.length)];
          room.pickups.push({ kind: 'item', item: prize, x: ROOM_W / 2, y: ROOM_H / 2 - 40, r: 14, price: 0 });
          state.toast = '试炼奖品';
          state.toastT = 1.3;
        } else {
          var luck = roll(state);
          if (luck < 0.1) {
            var drop = ITEM_POOL[Math.floor(roll(state) * ITEM_POOL.length)];
            room.pickups.push({ kind: 'item', item: drop, x: ROOM_W / 2, y: ROOM_H / 2 - 36, r: 14, price: 0 });
          } else if (luck < 0.28) room.pickups.push({ kind: 'seal', x: ROOM_W / 2, y: ROOM_H / 2 - 28, r: 10, price: 0 });
          else if (luck < 0.42) room.pickups.push({ kind: 'vial', x: ROOM_W / 2, y: ROOM_H / 2 - 28, r: 10, price: 0 });
          else if (luck < 0.58) room.pickups.push({ kind: 'flare', x: ROOM_W / 2, y: ROOM_H / 2 - 28, r: 10, price: 0 });
        }
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
    if ((state.dashT || 0) > 0) {
      var bx = state.px + (state.dashX || 0) * 540 * dt;
      var by = state.py + (state.dashY || 0) * 540 * dt;
      if (positionOk(state, room, bx, state.py)) state.px = bx;
      if (positionOk(state, room, state.px, by)) state.py = by;
      state.dashT -= dt;
      return;
    }
    var mx = input.mx || 0;
    var my = input.my || 0;
    var mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    var spd = SPEED * (state.speed || 1);
    var nx = state.px + mx * spd * dt;
    var ny = state.py + my * spd * dt;
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

  function pay(state, cost) {
    cost = cost || 0;
    if (cost <= 0) return true;
    if (cost > state.cinders) {
      if (state.denyT <= 0) {
        state.toast = '烬不够';
        state.toastT = 0.7;
        state.denyT = 0.8;
      }
      return false;
    }
    state.cinders -= cost;
    state.score += cost;
    return true;
  }

  function collect(state) {
    var room = roomAt(state);
    var keep = [];
    var tookChoice = false;
    for (var i = 0; i < room.pickups.length; i++) {
      var p = room.pickups[i];
      var dist = Math.hypot(p.x - state.px, p.y - state.py);
      if (dist > (p.r || 12) + state.r) {
        keep.push(p);
        continue;
      }
      if (!pay(state, p.price)) {
        keep.push(p);
        continue;
      }
      if (p.kind === 'item') {
        if (p.choice && tookChoice) {
          keep.push(p);
          continue;
        }
        applyItem(state, p.item);
        if (p.choice) tookChoice = true;
        continue;
      }
      if (p.kind === 'talent') {
        if (p.choice && tookChoice) {
          keep.push(p);
          continue;
        }
        applyTalent(state, p.talent);
        if (p.choice) tookChoice = true;
        continue;
      }
      if (p.kind === 'weapon') {
        if (p.choice && tookChoice) {
          keep.push(p);
          continue;
        }
        if (WEAPONS[p.weapon]) {
          state.weapon = p.weapon;
          state.toast = WEAPONS[p.weapon].name + ' · ' + WEAPONS[p.weapon].desc;
          state.toastT = 1.6;
          state.events.push('pickup');
        }
        if (p.choice) tookChoice = true;
        continue;
      }
      if (p.kind === 'wager') {
        var luck = roll(state);
        if (luck < 0.5) {
          if ((state.hp || 1) > 1) state.hp -= 1;
          state.cinders += 3;
          state.toast = '赌输了，留下三枚烬';
          state.events.push('hurt');
        } else {
          var prize = ITEM_POOL[Math.floor(roll(state) * ITEM_POOL.length)];
          applyItem(state, prize);
          state.toast = '赌赢了 · ' + itemName(prize);
        }
        state.toastT = 1.4;
        state.events.push('pickup');
        continue;
      }
      if (p.kind === 'cinder') {
        var gain = state.pact === 'thirst' ? 2 : 1;
        state.cinders += gain;
        state.score += 5 * gain;
        state.events.push('pickup');
        if (gain > 1) {
          if (!state.pops) state.pops = [];
          state.pops.push({ x: p.x, y: p.y - 16, text: '+2', kind: 'heal' });
        }
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
    if (tookChoice) {
      var left = [];
      for (var c = 0; c < keep.length; c++) if (!keep[c].choice) left.push(keep[c]);
      keep = left;
    }
    room.pickups = keep;
  }

  function step(state, input, dt) {
    if (!state || state.status !== 'play') return state;
    input = input || idle();
    dt = clamp(dt || 0, 0, 0.05);
    state.events = [];
    state.pops = [];
    state.time += dt;
    if (state.grace > 0) state.grace -= dt;
    if (state.iframes > 0) state.iframes -= dt;
    if (state.toastT > 0) state.toastT -= dt;
    if (state.shake > 0) state.shake -= dt;
    if (state.denyT > 0) state.denyT -= dt;
    if ((state.chainT || 0) > 0) state.chainT -= dt;
    if ((state.chainT || 0) <= 0) state.chain = 0;

    var room = roomAt(state);
    steerDash(state, input, dt);
    movePlayer(state, input, dt);
    var hazards = room.hazards || [];
    for (var h = 0; h < hazards.length; h++) {
      var hz = hazards[h];
      if (Math.hypot(hz.x - state.px, hz.y - state.py) < (hz.r || 14) + state.r - 2) {
        hurt(state, 1);
        break;
      }
    }

    if (input.flare && !state.flareHeld && state.flares > 0) {
      state.flares -= 1;
      state.iframes = Math.max(state.iframes, 0.28);
      state.shake = 0.2;
      state.events.push('flare');
      var boom = 4 + (state.cask || 0) * 2;
      for (var f = 0; f < room.enemies.length; f++) {
        room.enemies[f].hp -= boom;
        room.enemies[f].hurt = 0.16;
        ignite(state, room.enemies[f]);
        state.pops.push({ x: room.enemies[f].x, y: room.enemies[f].y - 18, text: String(boom), kind: 'hit' });
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
        state.shotCd = weaponCd(state);
      }
    }

    for (var i = 0; i < room.enemies.length; i++) {
      var e = room.enemies[i];
      if (e.hp <= 0) continue;
      if (e.hurt > 0) e.hurt -= dt;
      if (e.burn > 0) {
        e.burn -= dt;
        e.burnTick = (e.burnTick || 0) + dt;
        if (e.burnTick >= 0.35) {
          e.burnTick = 0;
          e.hp -= e.burnDmg || 1;
          e.hurt = 0.08;
          state.pops.push({ x: e.x, y: e.y - 12, text: '灼', kind: 'hit' });
          state.events.push('hit');
        }
        if (e.hp <= 0) continue;
      }
      var dx = state.px - e.x;
      var dy = state.py - e.y;
      var dist = Math.hypot(dx, dy) || 1;
      var ux = dx / dist;
      var uy = dy / dist;
      if (BOSS_PHASE[e.kind] && !e.phased && e.hp <= e.maxHp * 0.5) {
        e.phased = true;
        e.cd = Math.min(e.cd, 0.35);
        state.toast = BOSS_PHASE[e.kind];
        state.toastT = 1.4;
        state.events.push('phase');
      }
      if (e.kind === 'ash' || e.kind === 'king') {
        var dashSpd = e.kind === 'king' ? (e.phased ? 280 : 210) : 220;
        if (e.dash > 0) {
          e.x += e.dx * dashSpd * dt;
          e.y += e.dy * dashSpd * dt;
          e.dash -= dt;
        } else if (e.wind > 0) {
          e.wind -= dt;
          if (e.wind <= 0) e.dash = e.kind === 'king' && e.phased ? 0.42 : 0.32;
        } else {
          e.x += ux * e.speed * dt;
          e.y += uy * e.speed * dt;
          e.cd -= dt;
          if (dist < (e.kind === 'king' ? 220 : 176) && e.cd <= 0) {
            e.dx = ux;
            e.dy = uy;
            e.wind = e.kind === 'king' && e.phased ? 0.16 : 0.28;
            e.cd = e.kind === 'king' ? (e.phased ? 0.72 : 1.15) : 1.35;
          }
        }
      } else if (e.kind === 'moth' || e.kind === 'queen') {
        e.spin += dt * (e.kind === 'queen' ? 1.7 : 2.6);
        var orbit = e.kind === 'queen' ? (e.phased ? 92 : 72) : 48;
        if (e.dash > 0) {
          e.x += e.dx * (e.kind === 'queen' ? 300 : 250) * dt;
          e.y += e.dy * (e.kind === 'queen' ? 300 : 250) * dt;
          e.dash -= dt;
        } else {
          e.x = (e.hx || e.x) + Math.cos(e.spin) * orbit;
          e.y = (e.hy || e.y) + Math.sin(e.spin) * orbit * 0.72;
          e.cd -= dt;
          if (dist < 260 && e.cd <= 0) {
            e.dx = ux;
            e.dy = uy;
            e.dash = e.kind === 'queen' ? 0.28 : 0.2;
            e.cd = e.kind === 'queen' ? (e.phased ? 0.55 : 1.05) : 1.45;
          }
        }
      } else if (e.kind === 'bell' || e.kind === 'smith') {
        e.x += ux * e.speed * dt;
        e.y += uy * e.speed * dt;
        e.cd -= dt;
        if (e.cd <= 0) {
          if (e.kind === 'smith') radial(state, e, e.phased ? 12 : 6, e.phased ? 148 : 102);
          else radial(state, e, 5, 108);
          e.cd = e.kind === 'smith' ? (e.phased ? 0.8 : 1.5) : 1.65;
          state.events.push('toll');
        }
      } else {
        if (e.kind === 'spit' && dist < 108) { ux = -ux; uy = -uy; }
        else if (e.kind === 'spit' && dist < 150) { ux = 0; uy = 0; }
        e.x += ux * e.speed * dt;
        e.y += uy * e.speed * dt;
        if (e.kind === 'spit' || e.kind === 'warden') {
          e.cd -= dt;
          if (e.cd <= 0) {
            if (e.kind === 'warden') radial(state, e, e.phased ? 12 : 8, e.phased ? 156 : 132);
            else enemyShoot(state, e);
            e.cd = e.kind === 'warden' ? (e.phased ? 0.72 : Math.max(0.55, 1.45 - Math.min(6, state.floor) * 0.1)) : 1.25;
          }
        }
      }
    }
    separate(room);
    for (i = 0; i < room.enemies.length; i++) clampEnemy(room.enemies[i]);

    var nextBolts = [];
    for (i = 0; i < state.bolts.length; i++) {
      var b = state.bolts[i];
      b.age = (b.age || 0) + dt;
      if (b.mode === 'loop' && b.friendly) {
        if (!b.back && b.age >= 0.36) {
          b.back = 1;
          b.seen = {};
        }
        if (b.back) {
          var hx = state.px - b.x;
          var hy = state.py - b.y;
          var hd = Math.hypot(hx, hy) || 1;
          b.vx = (hx / hd) * 280;
          b.vy = (hy / hd) * 280;
          if (hd < 18) continue;
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) continue;
      if (b.x < -20 || b.y < -20 || b.x > ROOM_W + 20 || b.y > ROOM_H + 20) continue;
      if (b.friendly) {
        for (var h = 0; h < state.bolts.length; h++) {
          var shot = state.bolts[h];
          if (shot === b || shot.friendly || shot.life <= 0) continue;
          if (Math.hypot(shot.x - b.x, shot.y - b.y) <= shot.r + b.r) {
            shot.life = 0;
            b.hits -= 1;
            state.events.push('deflect');
            if (b.hits <= 0) break;
          }
        }
        if (b.hits <= 0) continue;
        var barrels = room.barrels || [];
        for (var c = 0; c < barrels.length; c++) {
          var crate = barrels[c];
          if (!crate || crate.hp <= 0) continue;
          if (Math.hypot(crate.x - b.x, crate.y - b.y) > crate.r + b.r) continue;
          crate.hp -= b.dmg;
          b.hits -= 1;
          state.events.push('hit');
          if (crate.hp <= 0) {
            state.events.push('blast');
            state.shake = Math.max(state.shake || 0, 0.16);
            state.pops.push({ x: crate.x, y: crate.y - 18, text: '轰', kind: 'crit' });
            for (var u = 0; u < room.enemies.length; u++) {
              var victim = room.enemies[u];
              if (victim.hp > 0 && Math.hypot(victim.x - crate.x, victim.y - crate.y) < 78) {
                strike(state, victim, 3);
              }
            }
          }
          if (b.hits <= 0) break;
        }
        if (b.hits <= 0) continue;
        var hit = false;
        for (var k = 0; k < room.enemies.length; k++) {
          var foe = room.enemies[k];
          if (foe.hp <= 0 || b.seen[foe.id]) continue;
          if (Math.hypot(foe.x - b.x, foe.y - b.y) <= foe.r + b.r) {
            strike(state, foe, b.dmg);
            b.seen[foe.id] = 1;
            b.hits -= 1;
            hit = true;
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
    var liveBolts = [];
    for (i = 0; i < nextBolts.length; i++) if (nextBolts[i].life > 0) liveBolts.push(nextBolts[i]);
    state.bolts = liveBolts.length > 96 ? liveBolts.slice(liveBolts.length - 96) : liveBolts;

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
          strike(state, orb, state.orbit);
          orb.orbitCd = 0.35;
        }
      }
    }

    if (state.status === 'play') {
      for (i = 0; i < room.enemies.length; i++) {
        var body = room.enemies[i];
        var gap = Math.hypot(body.x - state.px, body.y - state.py);
        if (body.hp > 0 && gap < body.r + state.r - 1) {
          if (hurt(state, 1)) {
            var away = gap || 1;
            var kx = state.px + ((state.px - body.x) / away) * 16;
            var ky = state.py + ((state.py - body.y) / away) * 16;
            if (positionOk(state, roomAt(state), kx, state.py)) state.px = kx;
            if (positionOk(state, roomAt(state), state.px, ky)) state.py = ky;
          }
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
    state.events = [];
    return true;
  }

  function snapshot(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function restore(data) {
    if (!data || data.v !== 1 || data.status !== 'play') return null;
    if (!Array.isArray(data.rooms) || (data.rooms.length !== 9 && data.rooms.length !== 12)) return null;
    if (typeof data.px !== 'number' || typeof data.hp !== 'number' || typeof data.floor !== 'number') return null;
    if (!data.rooms[data.roomId]) return null;
    data.events = [];
    return data;
  }

  function floorName(n) {
    var i = Math.max(1, n || 1) - 1;
    var set = FLOOR_SETS[Math.floor(i / 3) % FLOOR_SETS.length];
    return set[i % 3];
  }

  function bossForm(floor) {
    var n = Math.max(1, floor || 1);
    return BOSS_CYCLE[Math.floor((n - 1) / 3) % BOSS_CYCLE.length];
  }

  function bossName(kind) {
    return BOSS_NAME[kind] || '窑主';
  }

  function isBossKind(kind) {
    return !!BOSS_NAME[kind];
  }

  function lawName(id) { return LAWS[id] || ''; }
  function pactName(id) { return PACTS[id] || ''; }

  function applyPact(state) {
    var keys = ['thirst', 'leech', 'hunter', 'steady'];
    state.pact = keys[Math.floor(roll(state) * keys.length)];
    if (state.pact === 'hunter') state.damage = Math.min(6, (state.damage || 1) + 1);
  }

  function steerDash(state, input, dt) {
    if ((state.dashCd || 0) > 0) state.dashCd -= dt;
    var pressed = !!(input && input.dash);
    if (pressed && !state.dashHeld && (state.dashCd || 0) <= 0 && (state.dashT || 0) <= 0) {
      var mx = input.mx || 0;
      var my = input.my || 0;
      var mag = Math.hypot(mx, my);
      var dx = state.fx || 0;
      var dy = state.fy || -1;
      if (mag > 0.2) { dx = mx / mag; dy = my / mag; }
      var len = Math.hypot(dx, dy) || 1;
      state.dashX = dx / len;
      state.dashY = dy / len;
      state.dashT = 0.13;
      state.dashCd = state.spur ? Math.max(0.34, 0.78 - state.spur * 0.16) : 0.78;
      state.iframes = Math.max(state.iframes || 0, 0.2);
      state.events.push('dash');
      state.pops.push({ x: state.px, y: state.py - 22, text: '冲', kind: 'dash' });
    }
    state.dashHeld = pressed;
  }

  function strike(state, foe, dmg) {
    if (!state.pops) state.pops = [];
    if ((foe.shield || 0) > 0) {
      foe.shield -= 1;
      foe.hurt = 0.12;
      state.pops.push({ x: foe.x, y: foe.y - 18, text: '挡', kind: 'block' });
      state.events.push('block');
      return 0;
    }
    var dealt = dmg;
    var crit = roll(state) < 0.16 + (state.lens || 0) * 0.14;
    if (crit) dealt += 1;
    foe.hp -= dealt;
    foe.hurt = 0.12;
    ignite(state, foe);
    state.pops.push({ x: foe.x, y: foe.y - 16, text: crit ? dealt + '!' : String(dealt), kind: crit ? 'crit' : 'hit' });
    state.events.push(crit ? 'crit' : 'hit');
    return dealt;
  }

  function ignite(state, foe) {
    if (!state.brand || !foe || foe.hp <= 0) return;
    foe.burn = 1.4;
    foe.burnDmg = state.brand;
  }

  function itemName(id) {
    if (WEAPONS[id]) return WEAPONS[id].name;
    if (ITEMS[id]) return ITEMS[id].name;
    if (TALENTS[id]) return TALENTS[id].name;
    return '';
  }

  function itemDesc(id) {
    if (WEAPONS[id]) return WEAPONS[id].desc;
    if (ITEMS[id]) return ITEMS[id].desc;
    if (TALENTS[id]) return TALENTS[id].desc;
    return '';
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
    grantCursor: grantCursor,
    price: price,
    settle: settle,
    revive: revive,
    snapshot: snapshot,
    restore: restore,
    passageOpen: passageOpen,
    placeInDoor: placeInDoor,
    idle: idle,
    makeEnemy: makeEnemy,
    floorName: floorName,
    bossForm: bossForm,
    bossName: bossName,
    lawName: lawName,
    pactName: pactName,
    itemName: itemName,
    itemDesc: itemDesc,
    applyItem: applyItem
  };
});
