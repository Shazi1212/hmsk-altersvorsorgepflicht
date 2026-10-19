'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../public/plan.js');
const L = require('../public/logic.js');

const opts = (k) => [undefined, ...P.questions.find((q) => q.id === k).options];

function* allAnswers() {
  for (const self of opts('self')) for (const scheme of opts('scheme')) for (const side of opts('side'))
    for (const age of opts('age')) for (const priv of opts('private')) {
      const a = {};
      if (self) a.self = self; if (scheme) a.scheme = scheme; if (side) a.side = side;
      if (age) a.age = age; if (priv) a.private = priv;
      yield a;
    }
}

// Independent restatement of Empfehlung 22 as of 2026-10-19 (see plan.js). Update together with plan.js.
function expected(a) {
  if (!a.self) return { complete: false };
  if (a.self === 'no') return { complete: true, verdict: 'exempt', reason: 'not_self' };
  if (!a.scheme) return { complete: false };
  if (['ksk', 'vw', 'hw', 'drv', 'lak'].includes(a.scheme)) return { complete: true, verdict: 'exempt', reason: 'covered' };
  if (a.scheme === 'unsure') return { complete: true, verdict: 'unclear', reason: 'scheme_unsure' };
  if (!a.side || !a.age || !a.private) return { complete: false };
  if (a.age === 'pension') return { complete: true, verdict: 'unclear', reason: 'pension_age' };
  if (a.self === 'yes') return { complete: true, verdict: 'optout', reason: 'existing' };
  if (a.side === 'side') return { complete: true, verdict: 'unclear', reason: 'new_side' };
  return { complete: true, verdict: 'affected', reason: 'new_main' };
}

test('every combination of answers gives the expected verdict', () => {
  let n = 0;
  for (const a of allAnswers()) {
    n++;
    const r = L.evaluate(a);
    const e = expected(a);
    assert.equal(r.complete, e.complete, JSON.stringify(a));
    if (!e.complete) { assert.equal(r.verdict, null); continue; }
    assert.equal(r.verdict, e.verdict, JSON.stringify(a));
    assert.equal(r.reason, e.reason, JSON.stringify(a));
  }
  assert.equal(n, 4 * 8 * 3 * 3 * 5);
});

test('no complete answer set falls through the rules', () => {
  for (const a of allAnswers()) {
    const r = L.evaluate(a);
    if (r.complete) assert.notEqual(r.reason, 'no_rule', JSON.stringify(a));
  }
});

test('questions shown depend on earlier answers', () => {
  assert.deepEqual(L.relevant({}), ['self']);
  assert.deepEqual(L.relevant({ self: 'no' }), ['self']);
  assert.deepEqual(L.relevant({ self: 'yes' }), ['self', 'scheme']);
  assert.deepEqual(L.relevant({ self: 'yes', scheme: 'ksk' }), ['self', 'scheme']);
  assert.deepEqual(L.relevant({ self: 'plan', scheme: 'none' }), ['self', 'scheme', 'side', 'age', 'private']);
  assert.deepEqual(L.prune({ self: 'no', scheme: 'none', side: 'main', bogus: 'x' }), { self: 'no' });
});

test('contribution figures match the published 2026 values', () => {
  assert.equal(P.figures.year, 2026);
  assert.equal(L.regelbeitrag(), 735.63);   // 3,955 x 18.6 %
  assert.equal(L.karenzBeitrag(), 367.82);  // half, 367.815 rounded half up
  assert.equal(L.minBeitrag(), 112.16);     // 603 x 18.6 %
  assert.equal(L.maxBeitrag(), 1571.7);     // 8,450 x 18.6 %
});

test('income-based contribution is clamped between minimum income and BBG', () => {
  assert.equal(L.incomeBeitrag(''), null);
  assert.equal(L.incomeBeitrag(-5), null);
  assert.equal(L.incomeBeitrag('abc'), null);
  assert.equal(L.incomeBeitrag(0), 112.16);
  assert.equal(L.incomeBeitrag(603), 112.16);
  assert.equal(L.incomeBeitrag(2000), 372);
  assert.equal(L.incomeBeitrag('3955'), 735.63);
  assert.equal(L.incomeBeitrag(8450), 1571.7);
  assert.equal(L.incomeBeitrag(50000), 1571.7);
  assert.equal(L.round2(1.005), 1.01);
});

test('built-in self-test passes', () => {
  assert.deepEqual(L.selfTest(), []);
});

test('hash round trip keeps only valid answers and profit', () => {
  const a = { self: 'plan', scheme: 'none', side: 'main', age: 'under', private: 'none' };
  const h = L.toHash(a, '2500');
  assert.equal(h, '#self=plan&scheme=none&side=main&age=under&private=none&p=2500');
  assert.deepEqual(L.fromHash(h), { answers: a, profit: '2500' });
  assert.deepEqual(L.fromHash('#self=evil&p=1e9&x=1'), { answers: {}, profit: '' });
  assert.equal(L.toHash({}, ''), '');
});

test('plan config is consistent', () => {
  const ids = P.questions.map((q) => q.id);
  for (const r of P.rules) for (const k of Object.keys(r.when)) {
    assert.ok(ids.includes(k), 'rule uses unknown question ' + k);
    for (const v of r.when[k]) assert.ok(P.questions.find((q) => q.id === k).options.includes(v), k + '=' + v);
  }
  assert.match(P.asOf, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(P.sources.every((s) => /^https:\/\//.test(s.url)));
});

test('every text key used by plan.js exists in both languages', () => {
  global.window = {};
  require('../public/i18n.js');
  const I = global.window.AVP_I18N;
  for (const lang of ['de', 'en']) {
    const T = I[lang];
    for (const q of P.questions) {
      assert.ok(T['q_' + q.id] && T['h_' + q.id], lang + ' ' + q.id);
      for (const o of q.options) assert.ok(T['o_' + q.id + '_' + o], lang + ' o_' + q.id + '_' + o);
    }
    for (const r of P.rules) { assert.ok(T['r_' + r.reason], lang + ' r_' + r.reason); assert.ok(T['v_' + r.verdict], lang + ' v_' + r.verdict); }
    for (const s of P.timeline) assert.ok(T['tl_' + s.id], lang + ' tl_' + s.id);
    for (const s of P.sources) assert.ok(T.src[s.id], lang + ' src ' + s.id);
    assert.ok(T['stage_' + P.stage]);
    for (const v of ['optout', 'affected']) for (const p of ['ruerup', 'drvvol', 'none']) assert.ok(T['p_' + v + '_' + p], lang + ' p_' + v + '_' + p);
    for (const k of Object.keys(T)) if (typeof T[k] === 'string') assert.doesNotMatch(T[k], /[–—]/, lang + ' ' + k + ' has a dash');
  }
});
