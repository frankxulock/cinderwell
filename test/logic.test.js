'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

function kinds(seed) {
  return L.createRun(seed, L.newMeta()).rooms.map((r) => r.kind);
}

test('同一种子生成同一张井', () => {
  assert.deepEqual(kinds(42), kinds(42));
  assert.notDeepEqual(kinds(42), kinds(43));
});

test('每层有起点、库房、灯龛、货摊和窑主', () => {
  const s = L.createRun(99, L.newMeta());
  assert.equal(s.rooms.length, 9);
  for (const kind of ['start', 'cache', 'shrine', 'shop', 'boss']) {
    assert.equal(s.rooms.filter((r) => r.kind === kind).length, 1, kind);
  }
  const boss = s.rooms.find((r) => r.kind === 'boss');
  assert.ok(boss.enemies.some((e) => e.kind === 'warden'));
  const start = s.rooms.find((r) => r.kind === 'start');
  assert.equal(start.enemies.length, 0);
  assert.equal(s.rooms.find((r) => r.kind === 'shrine').pickups.some((p) => p.kind === 'item' && !p.price), true);
  s.rooms.forEach((room) => {
    for (const dir of ['n', 'e', 's', 'w']) {
      const to = room.links[dir];
      if (to == null) continue;
      const back = { n: 's', s: 'n', e: 'w', w: 'e' }[dir];
      assert.equal(s.rooms[to].links[back], room.id);
    }
  });
});

test('对着漂烬射击会清房', () => {
  const s = L.createRun(1, L.newMeta());
  const room = s.rooms[s.roomId];
  room.kind = 'combat';
  room.cleared = false;
  const foe = L.makeEnemy('mote', s.px, s.py - 70, 1, 50);
  foe.speed = 0;
  foe.hp = 3;
  room.enemies = [foe];
  const aim = { mx: 0, my: 0, ax: 0, ay: -1, flare: false };
  for (let i = 0; i < 200; i++) L.step(s, aim, 1 / 60);
  assert.equal(room.cleared, true);
  assert.equal(room.enemies.length, 0);
  assert.equal(s.status, 'play');
});

test('接触伤害有无敌时间', () => {
  const s = L.createRun(1, L.newMeta());
  const room = s.rooms[s.roomId];
  const foe = L.makeEnemy('mote', s.px, s.py, 1, 3);
  foe.speed = 0;
  room.enemies = [foe];
  const hp = s.hp;
  L.step(s, L.idle(), 0.016);
  assert.equal(s.hp, hp - 1);
  L.step(s, L.idle(), 0.016);
  assert.equal(s.hp, hp - 1);
  assert.ok(s.iframes > 0);
});

test('不能穿墙', () => {
  const s = L.createRun(1, L.newMeta());
  const room = s.rooms[s.roomId];
  room.links = { n: null, e: null, s: null, w: null };
  const input = { mx: -1, my: -1, ax: 0, ay: 0, flare: false };
  for (let i = 0; i < 150; i++) L.step(s, input, 1 / 30);
  assert.ok(s.px >= L.WALL);
  assert.ok(s.py >= L.WALL);
  assert.ok(s.px < 80);
  assert.ok(s.py < 80);
});

test('没火印进不了库房，有火印会消耗', () => {
  const s = L.createRun(7, L.newMeta());
  const cache = s.rooms.find((r) => r.kind === 'cache');
  let from = null;
  let dir = null;
  s.rooms.forEach((room) => {
    ['n', 'e', 's', 'w'].forEach((d) => {
      if (room.links[d] === cache.id) {
        from = room;
        dir = d;
      }
    });
  });
  from.cleared = true;
  s.roomId = from.id;
  s.grace = 0;
  s.seals = 0;
  assert.equal(L.passageOpen(s, from, dir), false);
  s.seals = 1;
  assert.equal(L.passageOpen(s, from, dir), true);
  L.placeInDoor(s, dir);
  L.step(s, L.idle(), 0.016);
  assert.equal(s.roomId, cache.id);
  assert.equal(s.seals, 0);
  assert.equal(cache.unlocked, true);
});

test('焰弹清掉房间里的敌人', () => {
  const s = L.createRun(1, L.newMeta());
  const room = s.rooms[s.roomId];
  room.kind = 'combat';
  room.cleared = false;
  const foe = L.makeEnemy('mote', s.px + 40, s.py, 1, 9);
  foe.speed = 0;
  foe.hp = 4;
  room.enemies = [foe];
  s.flares = 1;
  s.bolts = [{ x: 10, y: 10, vx: 0, vy: 0, r: 4, dmg: 1, hits: 1, life: 2, friendly: false, seen: {} }];
  L.step(s, { mx: 0, my: 0, ax: 0, ay: 0, flare: true }, 0.016);
  assert.equal(s.flares, 0);
  assert.equal(room.cleared, true);
  assert.equal(s.bolts.filter((b) => !b.friendly).length, 0);
  L.step(s, { mx: 0, my: 0, ax: 0, ay: 0, flare: true }, 0.016);
  assert.equal(s.flares, 0);
});

test('第三层窑主倒下算出井', () => {
  const s = L.createRun(1, L.newMeta());
  s.floor = 3;
  const room = s.rooms[s.roomId];
  room.kind = 'boss';
  room.cleared = false;
  const boss = L.makeEnemy('warden', s.px, s.py - 70, 3, 4);
  boss.speed = 0;
  boss.hp = 1;
  boss.cd = 5;
  room.enemies = [boss];
  for (let i = 0; i < 90; i++) L.step(s, { mx: 0, my: 0, ax: 0, ay: -1, flare: false }, 1 / 60);
  assert.equal(s.status, 'win');
});

test('灯塔商店和结算', () => {
  const meta = L.newMeta();
  meta.ash = 6;
  assert.equal(L.price(meta, 'vial'), 6);
  assert.equal(L.buy(meta, 'vial'), true);
  assert.equal(meta.vial, 1);
  assert.equal(meta.ash, 0);
  assert.equal(L.buy(meta, 'vial'), false);
  const run = L.createRun(2, meta);
  assert.equal(run.maxHp, 5);
  run.floor = 2;
  run.cinders = 10;
  run.score = 50;
  run.status = 'dead';
  const gained = L.settle(run, meta);
  assert.equal(gained, 6);
  assert.equal(meta.best, 50);
  assert.equal(L.settle(run, meta), 0);
  assert.equal(meta.ash, 6);
});

test('进度可以存档再读', () => {
  const s = L.createRun(9, L.newMeta());
  s.px = 140;
  const back = L.restore(L.snapshot(s));
  assert.equal(back.px, 140);
  assert.equal(back.rooms.length, 9);
  L.step(back, L.idle(), 0.016);
  assert.equal(L.restore({ status: 'dead' }), null);
});

test('死后复活一次，灯油加满', () => {
  const s = L.createRun(1, L.newMeta());
  assert.equal(L.revive(s), false);
  s.hp = 0;
  s.status = 'dead';
  assert.equal(L.revive(s), true);
  assert.equal(s.status, 'play');
  assert.equal(s.hp, s.maxHp);
  assert.ok(s.iframes > 0);
  s.status = 'dead';
  assert.equal(L.revive(s), false);
  assert.equal(L.restore(L.snapshot(Object.assign(s, { status: 'play' }))).revived, true);
});
