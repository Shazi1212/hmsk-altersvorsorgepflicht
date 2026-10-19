/* Altersvorsorgepflicht für Selbstständige: everything that can change when the draft law appears.
   Update this one object (and `asOf`) when the Referentenentwurf, the cabinet decision or the final law is out.
   No DOM access, so it loads in the browser (window.AVP_PLAN) and in Node for the tests (module.exports).

   Basis as of 19 October 2026:
   - Bericht der Alterssicherungskommission, 23 June 2026, Empfehlung 22 (p. 52 f.): all self-employed people who are
     not covered by a mandatory scheme and START after a cut-off date join the statutory pension (GRV) with no opt-out;
     people already self-employed are included too but may opt out without conditions ("voraussetzungsloses
     Herausoptieren"). Contribution modelled on the Handwerker Regelbeitrag, or income-based on request;
     3-year Karenzzeit at half the Regelbeitrag, only for the first start in a working life.
   - Coalition agreement CDU/CSU-SPD (April 2025): mandatory old-age provision for NEW self-employed people.
   - No Referentenentwurf yet (VGSD FAQ, 26 Aug / 11 Sep 2026). Target: law by end of 2026, start 2027 (not fixed).
   - 2026 figures: Bezugsgröße 3,955 €/month, contribution rate 18.6 %, Beitragsbemessungsgrenze 8,450 €/month,
     minimum income for income-based Handwerker contributions 603 €/month (SV-Rechengrößenverordnung 2026, DRV). */
(function (root) {
  'use strict';

  var PLAN = {
    asOf: '2026-10-19',
    // proposal -> draft (Referentenentwurf) -> cabinet -> passed (Bundestag + Bundesrat) -> in-force
    stage: 'proposal',
    plannedStart: '2027-01-01',   // political target, not in any law yet
    startConfirmed: false,
    cutoffDate: null,             // "Stichtag" that splits existing and new self-employed people; open

    figures: {
      year: 2026,
      bezugsgroesse: 3955,        // €/month, § 18 SGB IV
      rate: 0.186,                // general pension contribution rate
      bbg: 8450,                  // €/month, Beitragsbemessungsgrenze allgemeine RV
      minIncome: 603,             // €/month, minimum for income-based contributions (today's Handwerker rule)
      karenzYears: 3,
      karenzFactor: 0.5,
    },

    // Questions in order. A question is asked only when every condition in `showIf` matches the answers so far.
    questions: [
      { id: 'self', options: ['yes', 'plan', 'no'] },
      { id: 'scheme', options: ['none', 'ksk', 'vw', 'hw', 'drv', 'lak', 'unsure'], showIf: { self: ['yes', 'plan'] } },
      { id: 'side', options: ['main', 'side'], showIf: { self: ['yes', 'plan'], scheme: ['none'] } },
      { id: 'age', options: ['under', 'pension'], showIf: { self: ['yes', 'plan'], scheme: ['none'] } },
      { id: 'private', options: ['ruerup', 'other', 'drvvol', 'none'], showIf: { self: ['yes', 'plan'], scheme: ['none'] } },
    ],

    // First matching rule wins. verdict: affected | exempt | optout | unclear. `reason` picks the explanation text.
    rules: [
      { when: { self: ['no'] }, verdict: 'exempt', reason: 'not_self' },
      { when: { scheme: ['ksk', 'vw', 'hw', 'drv', 'lak'] }, verdict: 'exempt', reason: 'covered' },
      { when: { scheme: ['unsure'] }, verdict: 'unclear', reason: 'scheme_unsure' },
      { when: { age: ['pension'] }, verdict: 'unclear', reason: 'pension_age' },
      { when: { self: ['yes'] }, verdict: 'optout', reason: 'existing' },
      { when: { self: ['plan'], side: ['side'] }, verdict: 'unclear', reason: 'new_side' },
      { when: { self: ['plan'] }, verdict: 'affected', reason: 'new_main' },
    ],

    // Which contribution figures to show per verdict (karenz = the 3 founder years at half rate).
    showCost: { affected: { karenz: true }, unclear: { karenz: true }, optout: { karenz: false } },

    // Timeline of the law. done: true once it happened; date null while unknown.
    timeline: [
      { id: 'coalition', date: '2025-04-09', done: true },
      { id: 'report', date: '2026-06-23', done: true },
      { id: 'draft', date: null, done: false },
      { id: 'cabinet', date: null, done: false },
      { id: 'passed', date: null, done: false, target: '2026-12-31' },
      { id: 'start', date: null, done: false, target: '2027-01-01' },
    ],

    sources: [
      { id: 'report', url: 'https://www.bmas.de/DE/Soziales/Rente-und-Altersvorsorge/Rentenreform-2025/Rentenkommission-2026/rentenkommission-2026.html' },
      { id: 'report_pdf', url: 'https://www.vgsd.de/wp-content/uploads/2026/06/Bericht_der_Alterssicherungskommission.pdf' },
      { id: 'coalition', url: 'https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2025/250411-sprachregelung-drv-bund-koav.html' },
      { id: 'status', url: 'https://www.vgsd.de/kommt-jetzt-die-versicherungspflicht-faq-zur-geplanten-rentenreform-was-selbststaendige-jetzt-wissen-muessen/' },
      { id: 'figures', url: 'https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2025/250910-sv-rechengroessen-vo-2026.html' },
      { id: 'sgb6_2', url: 'https://www.gesetze-im-internet.de/sgb_6/__2.html' },
      { id: 'sgb6_6', url: 'https://www.gesetze-im-internet.de/sgb_6/__6.html' },
      { id: 'ksvg', url: 'https://www.gesetze-im-internet.de/ksvg/__1.html' },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = PLAN;
  else root.AVP_PLAN = PLAN;
})(typeof window !== 'undefined' ? window : globalThis);
