/* UI for the Altersvorsorgepflicht check. Rules and figures live in plan.js, logic in logic.js, texts in i18n.js. */
(function () {
  'use strict';
  var L = window.AVPLogic;
  var P = window.AVP_PLAN;
  var I = window.AVP_I18N;
  var CFG = window.AVP_CONFIG || {};
  var SITE = CFG.siteBase || '';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var lang = pickLang();
  var state = L.fromHash(location.hash);
  var answers = state.answers;
  var profit = state.profit;
  var fails = L.selfTest();
  if (fails.length) console.error('Altersvorsorgepflicht self-test failed:', fails);

  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'de' || q === 'en') return q;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'de';
    return /^en\b/i.test(nav) ? 'en' : 'de';
  }
  function t(key, vars) {
    var s = I[lang][key];
    if (s === undefined) s = I.de[key];
    if (s === undefined) s = key;
    if (vars && typeof s === 'string') Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function fmtDate(iso) {
    var p = iso.split('-');
    return new Intl.DateTimeFormat(t('locale'), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])));
  }
  function eur(x) { return new Intl.NumberFormat(t('locale'), { style: 'currency', currency: 'EUR' }).format(x); }
  function eur0(x) { return new Intl.NumberFormat(t('locale'), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(x); }
  function pct(x) { return new Intl.NumberFormat(t('locale'), { maximumFractionDigits: 1 }).format(x * 100); }
  function link(href) { return SITE + href; }
  function resultUrl() {
    return location.origin + location.pathname + (lang === 'en' ? '?lang=en' : '') + L.toHash(answers, profit);
  }

  // ---------- static texts ----------
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('title');
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    $('#lnkHome').href = link(t('home_href'));
    $('#lnkImprint').href = link(t('imprint_href'));
    $('#lnkImprint').textContent = t('imprint');
    $('#lnkPrivacy').href = link(t('privacy_href'));
    $('#lnkPrivacy').textContent = t('privacy');
    $('#mailBtn').href = link(t('contact_href'));
    $('#stageChip').textContent = t('stage_' + P.stage);
    $('#bannerText').textContent = t('banner', { d: fmtDate(P.asOf) });
    $('#asOf').textContent = t('asof', { d: fmtDate(P.asOf) });
    $('#noteText').textContent = t('note', { d: fmtDate(P.asOf) });
    $('#sourcesList').innerHTML = P.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" rel="noopener" target="_blank">' + esc(t('src')[s.id] || s.url) + '</a><span class="src-url">' + esc(s.url) + '</span></li>';
    }).join('');
    $('#openList').innerHTML = t('open_list').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    renderTimeline();
    buildForm();
  }

  function renderTimeline() {
    $('#timeline').innerHTML = P.timeline.map(function (s) {
      var date = s.date ? fmtDate(s.date) : '';
      var sub = '';
      if (!s.date && s.target) sub = t(s.id === 'start' ? 'tl_target_start' : 'tl_target', { d: fmtDate(s.target) });
      var chip = s.done ? '<span class="chip chip--on">' + esc(t('chip_done')) + '</span>' : '<span class="chip">' + esc(t('chip_open')) + '</span>';
      return '<li class="tl__row' + (s.done ? ' tl__row--key' : '') + '"><span class="tl__date">' + (date ? esc(date) : '&nbsp;') + '</span>' +
        '<span class="tl__what"><b>' + esc(t('tl_' + s.id)) + '</b> ' + chip + (sub ? '<span class="tl__desc">' + esc(sub) + '</span>' : '') + '</span></li>';
    }).join('');
  }

  // ---------- questions (built from plan.js) ----------
  function buildForm() {
    var html = P.questions.map(function (q) {
      return '<fieldset class="q" data-q="' + q.id + '">' +
        '<legend><span class="flag">--' + q.id + '</span> ' + esc(t('q_' + q.id)) + '</legend>' +
        '<p class="hint">' + esc(t('h_' + q.id)) + '</p><div class="opts">' +
        q.options.map(function (o) {
          return '<label><input type="radio" name="' + q.id + '" value="' + o + '"><span>' + esc(t('o_' + q.id + '_' + o)) + '</span></label>';
        }).join('') + '</div></fieldset>';
    }).join('');
    html += '<p class="qs__foot"><button type="button" class="linkish" id="resetBtn">' + esc(t('reset')) + '</button></p>';
    $('#questions').innerHTML = html;
    $('#resetBtn').addEventListener('click', function () { answers = {}; profit = ''; writeHash(); syncForm(); render(); });
    syncForm();
  }
  function syncForm() {
    var rel = L.relevant(answers);
    $$('.q').forEach(function (fs) {
      var k = fs.getAttribute('data-q');
      fs.hidden = rel.indexOf(k) === -1;
      $$('input', fs).forEach(function (inp) { inp.checked = answers[k] === inp.value; });
    });
  }
  function onChange(e) {
    var inp = e.target;
    if (!inp || inp.type !== 'radio') return;
    answers[inp.name] = inp.value;
    answers = L.prune(answers);
    writeHash();
    syncForm();
    render();
  }
  function writeHash() {
    var h = L.toHash(answers, profit);
    history.replaceState(null, '', location.pathname + location.search + (h || ''));
  }

  // ---------- result ----------
  function render() {
    var r = L.evaluate(answers);
    var body = $('#resultBody');
    var narrow = window.matchMedia('(max-width: 879px)').matches;
    if (!r.complete) {
      body.innerHTML = '<p class="dim">' + esc(t(narrow ? 'pending_m' : 'pending')) + '</p>';
      return;
    }
    var html = [];
    html.push('<p class="verdict verdict--' + r.verdict + '">' + esc(t('v_' + r.verdict)) + '</p>');
    html.push('<p>' + esc(t('r_' + r.reason)) + '</p>');
    if (r.reason === 'covered' && answers.scheme === 'hw') html.push('<p class="small">' + esc(t('r_covered_hw')) + '</p>');
    var pv = answers.private === 'other' ? 'ruerup' : answers.private;
    if (pv && (r.verdict === 'optout' || r.verdict === 'affected')) html.push('<p class="small">' + esc(t('p_' + r.verdict + '_' + pv)) + '</p>');

    var cost = P.showCost[r.verdict];
    if (cost) {
      var f = P.figures;
      html.push('<h2 class="h2">' + esc(t('cost_title')) + '</h2>' +
        '<p class="small">' + esc(t('cost_lead', { y: f.year })) + '</p><dl class="cost">' +
        costRow(t('cost_regel'), t('cost_regel_d', { rate: pct(f.rate), bg: eur0(f.bezugsgroesse) }), eur(L.regelbeitrag())));
      if (cost.karenz) {
        html.push(costRow(t('cost_karenz', { n: f.karenzYears }), t('cost_karenz_d'), eur(L.karenzBeitrag())));
      }
      var ib = L.incomeBeitrag(profit);
      html.push('<div class="cost__row"><dt>' + esc(t('cost_income')) +
        '<label class="cost__in"><span>' + esc(t('cost_income_l')) + '</span><input type="number" id="profitIn" min="0" step="100" inputmode="numeric" value="' + esc(profit) + '"></label>' +
        '<span class="tl__desc">' + esc(t('cost_income_d', { rate: pct(f.rate), min: eur0(f.minIncome), max: eur0(f.bbg) })) + '</span></dt>' +
        '<dd id="incomeOut">' + (ib === null ? '<span class="dim">' + esc(t('cost_income_empty')) + '</span>' : esc(eur(ib)) + ' <span class="dim">' + esc(t('per_month')) + '</span>') + '</dd></div></dl>');
      if (fails.length) html.push('<p class="small warn">' + esc(t('selftest_fail')) + '</p>');
    }

    html.push('<div class="tools"><button type="button" class="linkish" id="shareBtn">' + esc(t('share')) + '</button>' +
      '<button type="button" class="linkish" id="printBtn">' + esc(t('print')) + '</button><span class="dim small" id="shareMsg" role="status"></span></div>');

    body.innerHTML = html.join('');
    var pin = $('#profitIn');
    if (pin) pin.addEventListener('input', function () {
      var v = pin.value.trim();
      profit = /^\d{1,7}$/.test(v) ? v : '';
      var b = L.incomeBeitrag(profit);
      $('#incomeOut').innerHTML = b === null ? '<span class="dim">' + esc(t('cost_income_empty')) + '</span>' : esc(eur(b)) + ' <span class="dim">' + esc(t('per_month')) + '</span>';
      writeHash();
    });
    $('#shareBtn').addEventListener('click', share);
    $('#printBtn').addEventListener('click', function () { window.print(); });
  }

  function costRow(title, desc, amount) {
    return '<div class="cost__row"><dt>' + esc(title) + '<span class="tl__desc">' + esc(desc) + '</span></dt><dd>' +
      esc(amount) + ' <span class="dim">' + esc(t('per_month')) + '</span></dd></div>';
  }

  function share() {
    var url = resultUrl();
    var msg = $('#shareMsg');
    var done = function () { msg.textContent = t('copied'); setTimeout(function () { msg.textContent = ''; }, 2500); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt(t('share'), url); });
    } else {
      window.prompt(t('share'), url);
    }
  }

  // ---------- wiring ----------
  $('#questions').addEventListener('change', onChange);
  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.getAttribute('data-lang');
      var u = new URL(location.href);
      u.searchParams.set('lang', lang);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      applyLang(); render();
    });
  });
  window.addEventListener('hashchange', function () {
    var s = L.fromHash(location.hash);
    answers = s.answers; profit = s.profit; syncForm(); render();
  });

  applyLang();
  render();
})();
