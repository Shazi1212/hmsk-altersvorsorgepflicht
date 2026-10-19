# Altersvorsorgepflicht: Betrifft mich das?

Germany plans a mandatory pension for self-employed people (start planned for 2027), and nobody knows yet whether it applies to them: this check answers it in five questions, based on the current plans.

**Use it free:** https://hmsk.life/de/tools/altersvorsorgepflicht/ (English: https://hmsk.life/tools/altersvorsorgepflicht/)

> **No law yet.** As of 19 October 2026 there is only recommendation 22 of the Alterssicherungskommission
> (report of 23 June 2026) and the coalition's plan. No draft bill (Referentenentwurf) is out. The check says so on
> the page, with sources and the "as of" date.

## What it does

- Five questions: self-employed now or starting soon? already in a mandatory scheme (KSK, Versorgungswerk, Handwerk, other DRV duty, LAK)? main or side business? retirement age? existing private provision?
- Result: **likely affected**, **likely exempt**, **opt-out likely possible** or **unclear**, with the reason in plain words.
- What it could cost under the proposal, with the 2026 figures: standard contribution 735.63 €/month, 367.82 € in the 3-year founder period, or 18.6 % of your profit (between 112.16 € and 1,571.70 €).
- Where the law stands (timeline) and what is still open.
- "Email me when the law passes" link to the hmsk.life contact form, tagged `altersvorsorgepflicht`.
- German and English (`?lang=en`), answers in the URL hash so a result can be shared, print-friendly. Nothing is stored or sent.

## Updating when the draft law appears

Everything that can change is in **one object in `public/plan.js`**: `asOf`, `stage`, `plannedStart`, `cutoffDate`,
the 2026 `figures`, the `questions` (with `showIf`), the `rules` (first match wins), the `timeline` and the `sources`.
Texts for new reasons or options go into `public/i18n.js` (`r_<reason>`, `o_<question>_<option>`).
Then update `expected()` in `tests/logic.test.js` and `EXPECT` in `logic.js` if figures changed, and run the tests.

## Quick start

Static page, no build step, no dependencies.

```sh
python3 -m http.server 8080 --directory public   # then open http://localhost:8080
```

Site links (tool page, imprint, contact form) point to `https://hmsk.life`; change `siteBase` in `public/config.js`
for your own copy.

## Tests

```sh
node --test tests/
```

Every combination of answers against an independent restatement of the rules, the contribution maths against the
published 2026 values, the URL hash, config consistency, and that every text exists in both languages. The same
figures are checked by `selfTest()` in the browser on every load (failures go to the console and show a warning).

## Sources

- Bericht der Alterssicherungskommission, 23 June 2026, Empfehlung 22, p. 52 f. ([BMAS](https://www.bmas.de/DE/Soziales/Rente-und-Altersvorsorge/Rentenreform-2025/Rentenkommission-2026/rentenkommission-2026.html))
- Coalition agreement CDU/CSU and SPD, April 2025 ([DRV statement](https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2025/250411-sprachregelung-drv-bund-koav.html))
- Status: [VGSD FAQ](https://www.vgsd.de/kommt-jetzt-die-versicherungspflicht-faq-zur-geplanten-rentenreform-was-selbststaendige-jetzt-wissen-muessen/), updated 11 September 2026
- 2026 figures: [DRV, Rechengrößen 2026](https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2025/250910-sv-rechengroessen-vo-2026.html)
- § 2 and § 6 SGB VI, § 1 KSVG

Not legal or pension advice.

## License

MIT, see [LICENSE](LICENSE). Fonts: Martian Mono and Geist (SIL Open Font License).
