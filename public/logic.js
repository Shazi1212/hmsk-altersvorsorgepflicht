/* Altersvorsorgepflicht check: generic rule engine over plan.js, plus the contribution maths.
   No DOM access, so the same file runs in the browser (window.AVPLogic) and in Node for the tests. */
(function (root) {
  'use strict';

  var PLAN = root.AVP_PLAN || (typeof require === 'function' ? require('./plan.js') : null);

  function byId(id) {
    for (var i = 0; i < PLAN.questions.length; i++) if (PLAN.questions[i].id === id) return PLAN.questions[i];
    return null;
  }

  function matches(when, a) {
    return Object.keys(when || {}).every(function (k) { return when[k].indexOf(a[k]) !== -1; });
  }

  // Keep only known questions with allowed values.
  function clean(answers) {
    var out = {};
    answers = answers || {};
    PLAN.questions.forEach(function (q) {
      if (q.options.indexOf(answers[q.id]) !== -1) out[q.id] = answers[q.id];
    });
    return out;
  }

  // Question ids to show, given the answers so far.
  function relevant(answers) {
    var a = clean(answers);
    return PLAN.questions.filter(function (q) { return matches(q.showIf, a); }).map(function (q) { return q.id; });
  }

  // Drop answers to questions that are no longer shown (keeps the shared link clean).
  function prune(answers) {
    var a = clean(answers);
    var rel = relevant(a);
    Object.keys(a).forEach(function (k) { if (rel.indexOf(k) === -1) delete a[k]; });
    return a;
  }

  /* evaluate(answers) -> { complete, verdict: null | 'affected' | 'exempt' | 'optout' | 'unclear', reason } */
  function evaluate(answers) {
    var a = prune(answers);
    var need = relevant(a);
    var complete = need.every(function (k) { return a[k] !== undefined; });
    var r = { complete: complete, verdict: null, reason: null, answers: a };
    if (!complete) return r;
    for (var i = 0; i < PLAN.rules.length; i++) {
      if (matches(PLAN.rules[i].when, a)) { r.verdict = PLAN.rules[i].verdict; r.reason = PLAN.rules[i].reason; return r; }
    }
    r.verdict = 'unclear'; r.reason = 'no_rule';
    return r;
  }

  // ---------- money (euro amounts, rounded half up to the cent) ----------
  function round2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }

  // Monthly contribution modelled on today's Handwerker Regelbeitrag: Bezugsgröße x rate.
  function regelbeitrag(f) { f = f || PLAN.figures; return round2(f.bezugsgroesse * f.rate); }
  function karenzBeitrag(f) { f = f || PLAN.figures; return round2(f.bezugsgroesse * f.rate * f.karenzFactor); }
  function minBeitrag(f) { f = f || PLAN.figures; return round2(f.minIncome * f.rate); }
  function maxBeitrag(f) { f = f || PLAN.figures; return round2(f.bbg * f.rate); }

  /* Income-based alternative: rate x monthly profit, between the minimum income and the
     Beitragsbemessungsgrenze (today's rule for Handwerker; the new law may set other limits).
     Returns null for an empty or invalid profit. */
  function incomeBeitrag(profit, f) {
    f = f || PLAN.figures;
    var p = Number(profit);
    if (profit === '' || profit === null || profit === undefined || !isFinite(p) || p < 0) return null;
    var base = Math.min(Math.max(p, f.minIncome), f.bbg);
    return round2(base * f.rate);
  }

  // ---------- URL hash (shareable result) ----------
  function toHash(answers, profit) {
    var a = prune(answers);
    var parts = PLAN.questions.filter(function (q) { return a[q.id] !== undefined; }).map(function (q) { return q.id + '=' + a[q.id]; });
    if (profit !== undefined && profit !== null && profit !== '' && /^\d{1,7}$/.test(String(profit))) parts.push('p=' + profit);
    return parts.length ? '#' + parts.join('&') : '';
  }
  function fromHash(hash) {
    var out = {};
    var profit = '';
    String(hash || '').replace(/^#/, '').split('&').forEach(function (p) {
      var kv = p.split('=');
      if (kv.length !== 2) return;
      if (kv[0] === 'p') { if (/^\d{1,7}$/.test(kv[1])) profit = kv[1]; } else out[kv[0]] = kv[1];
    });
    return { answers: prune(out), profit: profit };
  }

  /* Self-test against the published 2026 figures (DRV / Handwerkskammern: Regelbeitrag 735.63, half 367.82,
     minimum 112.16, maximum 1,571.70). Runs on every page load; returns a list of failures (empty = fine).
     When plan.js gets new figures, update the expected values here in the same commit. */
  var EXPECT = { year: 2026, regel: 735.63, karenz: 367.82, min: 112.16, max: 1571.70 };
  function selfTest() {
    var fails = [];
    function eq(name, got, want) { if (got !== want) fails.push(name + ': got ' + got + ', want ' + want); }
    if (PLAN.figures.year === EXPECT.year) {
      eq('regelbeitrag', regelbeitrag(), EXPECT.regel);
      eq('karenzBeitrag', karenzBeitrag(), EXPECT.karenz);
      eq('minBeitrag', minBeitrag(), EXPECT.min);
      eq('maxBeitrag', maxBeitrag(), EXPECT.max);
      eq('incomeBeitrag(2000)', incomeBeitrag(2000), 372);
      eq('incomeBeitrag(100)', incomeBeitrag(100), EXPECT.min);
      eq('incomeBeitrag(20000)', incomeBeitrag(20000), EXPECT.max);
    } else {
      fails.push('plan.js figures are for ' + PLAN.figures.year + ', self-test expects ' + EXPECT.year);
    }
    eq('incomeBeitrag(-1)', incomeBeitrag(-1), null);
    eq('verdict new main', evaluate({ self: 'plan', scheme: 'none', side: 'main', age: 'under', private: 'none' }).verdict, 'affected');
    eq('verdict existing', evaluate({ self: 'yes', scheme: 'none', side: 'main', age: 'under', private: 'ruerup' }).verdict, 'optout');
    eq('verdict KSK', evaluate({ self: 'yes', scheme: 'ksk' }).verdict, 'exempt');
    eq('verdict not self', evaluate({ self: 'no' }).verdict, 'exempt');
    return fails;
  }

  var api = {
    selfTest: selfTest,
    PLAN: PLAN, byId: byId, matches: matches, clean: clean, relevant: relevant, prune: prune, evaluate: evaluate,
    round2: round2, regelbeitrag: regelbeitrag, karenzBeitrag: karenzBeitrag, minBeitrag: minBeitrag,
    maxBeitrag: maxBeitrag, incomeBeitrag: incomeBeitrag, toHash: toHash, fromHash: fromHash,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AVPLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
