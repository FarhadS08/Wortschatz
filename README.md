# Wortschatz — Moin, Deutsch!

A German flashcard app: single page, no build step, installable on your phone, works offline.



## Use it everywhere

- **Install as an app**: the site is a PWA — on Android/Chrome use *Add to Home Screen / Install*,
  on iOS Safari use *Share → Add to Home Screen*. It launches standalone with its own icon.
- **Offline**: a service worker caches the app; your words are stored in `localStorage` on the device.
- **Responsive**: layouts for small phones (320 px+), notched screens (safe areas), landscape, tablet and desktop — on screens ≥ 1000 px the study view becomes a two-pane layout: streak + deck panel as a fixed sidebar on the left (always open, groups still fold), a bigger flashcard on the right, and centered tabs, so wide monitors aren't just empty margins.

> Words are stored in the browser (localStorage) and can additionally sync between devices with an account — see below.

## Accounts & sync

The app has built-in accounts ("Konto & Sync" via the cloud button in the header): register once, log in on each device, and your words plus the full learning progress sync automatically — the deck is pulled when the app opens and pushed ~1.5 s after every change; the newest state wins.

You stay logged in via a secure (`HttpOnly`) session cookie that renews itself for 90 days on every visit — even if the browser clears local storage, the app logs itself back in and restores the deck from the server.

## Features

- **Spaced repetition (SM-2)** — the Anki-style algorithm: four grades (Nochmal / Schwer / Gut / Leicht) with the projected interval shown on each button, learning steps for new cards (1/10 min), growing review intervals (interval × per-card ease factor, with fuzz), and lapse handling (failed reviews drop into relearning with a reduced interval and ease). Scheduling is day-based like Anki: day intervals come due at 03:00 of the target day, so a card graded in the evening is ready the next morning; cards in learning steps stay in the due count and rounds via a 20-minute learn-ahead window, and re-queued cards (learning steps, failures, presented new words) reappear a few cards later in the round rather than at its end. Decks from the previous Leitner version migrate automatically with progress preserved
- **Topics with deck states** — all deck controls live in a collapsible "Decks & Runden" bar with a live summary ("12/31 aktiv · 10 · Mix"), keeping the study screen focused on the card; inside, the decks are organized into foldable groups (Weitere Decks, Sätze & Floskeln, Grundwortschatz, Länder) that are collapsed to slim header bars by default — each showing "x/y aktiv" and an "Alle aus/an" switch that works without expanding — so the panel stays a single screen instead of an endless scroll; tap a group to unfold its deck cards (the app remembers which groups you keep open); every deck card carries a mini progress bar (green = learned & in repetition, amber = currently learning, grey = untouched), a ✓ once no new words remain, and the exact breakdown as a tooltip
- **Rounds ("Pro Runde")** — practice in chunks of 5 / 10 / 15 / 25 cards instead of everything at once; the done screen shows how many cards are still due and starts the next chunk
- **Smart round composition ("Modus")** — rounds are dealt deterministically, not randomly: overdue reviews first, then cards in learning, then new words in book order; words you finished this sitting don't repeat in the next rounds; the counter shows the mix ("3 fällig + 7 neu"); switch the mode to Mix / Neue / Fällige
- **Learn state for new words** — cards you have never studied are presented first (word, translation, example and note all visible) before they get quizzed later in the same round; "Kenn ich schon" skips a known word straight to a 4-day interval
- **Repeat & drill** — "Diese Runde wiederholen" runs the same words again as an ungraded practice round (your schedule stays untouched); in the word list, "Auswählen" lets you hand-pick any words and start them as a real learning round or a drill
- **Daily review across all decks (🔁 Wiederholung)** — one tap under the deck panel drills *every word you have ever studied*, no matter which deck it came from and whether that deck is currently active. The capture is guaranteed: the moment a card is graded or even just shown as a new-word presentation, it's stamped with a study date — so what you did yesterday across three different decks is 100% in today's review, front of the queue (the pool is ordered newest study-day first, most-urgent first within a day, and the bar shows it: "214 Wörter · 32 von heute & gestern"). Rounds are dealt in your "Pro Runde" size with a "Weiter wiederholen (n übrig)" button chaining chunks until you've been through everything, then the cycle restarts; the pool grows automatically as you learn more. It's pure extra exposure: everything runs as an ungraded practice round, so your SM-2 intervals are never distorted. Existing decks get their study dates backfilled from the scheduler on first load
- **Difficult words (🔥 Schwere Wörter)** — the app watches which words you keep missing: every "Nochmal / didn't know" — in real rounds *and* in practice rounds — counts, and a word becomes "difficult" once you've missed it 3 times, forgotten it twice after it was learned (lapses), or the scheduler keeps rating it hard (low ease). Those words form their own virtual deck as a second bar under the Wiederholung bar ("12 Wörter · oft nicht gewusst") — one tap drills exactly them, hardest first, in Pro-Runde chunks, ungraded so the schedule stays clean. Answer a difficult word correctly 4 times in a row and it graduates off the list — miss it once more and it's back. The word list gets a matching "Schwere" filter, and each difficult word shows a 🔥 "schwer zu merken" badge with its miss count in the detail view; existing decks derive the counts from their lapse history
- **Unlimited words & own decks** — add your own words in the *+ Neu* tab, and create your own categories with the dashed *+ Thema* chip (empty decks persist, sync with your account, and can be removed again via their ×)
- **AI assist** — type just the German word and the AI fills in the article, translation, example sentence (with English translation) and a grammar note
- **App language (🌐, top right)** — not every German learner knows English or German: the whole interface (tabs, buttons, states, toasts, forms — 157 strings) switches between 17 languages: Deutsch, English, Türkçe, Azərbaycanca, Русский, Español, Français, Italiano, Português, Polski, Українська, Nederlands, Ελληνικά, Čeština, Română, Magyar and Svenska. For non-English/German languages the word meanings and example translations are also localized: generated in one batched AI call per round via `api/ai.js` and cached on the device (falls back to English without the AI server). The choice syncs with your account
- **Example translations** — cards with an example sentence show its English translation right below it
- **Browse decks & word details** — the word list filters by deck (chip row on top) *and by learning state* (Alle / Neue / Am Lernen / Gelernt / Fällige / **Heute & Gestern** — everything you studied today or yesterday), combined with search; every row shows the date the word was added, and the expanded detail shows both "Hinzugefügt" and "Zuletzt gelernt" dates — so you can pull up exactly the words you did on a given day in a given deck and hand-pick them via "Auswählen" to learn or drill again; when a deck is selected, a coverage header shows its total, progress bar and clickable state counts — so you can verify at a glance that every word of a deck has been covered (deck chip numbers in the study view jump straight there). Tapping a word unfolds its full record: learning status with next review, color-coded article, example sentence with translation, tip and deck — plus controls to reset it to new, mark it as learned, or edit it
- **Streak & daily goal** — a slim strip above the deck shows your 🔥 day streak (any day with at least one graded card keeps it alive), a daily-goal ring (tap to cycle 10/20/30/50 cards) with a confetti moment when you reach it, and your 🏆 record streak; all of it syncs with your account

## Built-in categories

| Category | Cards | Source |
|---|---|---|
| Meine Wörter | 9 | starter words |
| Adjektive | 16 | common adjectives |
| Präpositionen | 14 | prepositions with case notes |
| Sätze & Floskeln (11 decks) | 421 | *Moin, Deutsch! Band II* everyday phrases, split along the book's chapters into 11 decks of 30–44 cards: Grüßen & Höflichkeit, Reaktionen & Meinung, Smalltalk & Sätze, Füllwörter & Ausrufe, Hilfe & Pläne, Bäcker & Kasse, Restaurant & Bahn, Wege & Zahlen, Arzt & Amt, Telefon & Arbeit, Wohnung & Feste — each deck card carries its own translated subtitle with its place in the series ("restaurant & train · 7/11") |
| Grundwortschatz (14 decks) | 595 | *Moin, Deutsch!* Band I word list, split thematically into 14 decks of 35–54 cards: Erste Wörter, Kleine Wörter, Zahlen, Alltagsverben, Mehr Verben, Menschen & Arbeit, Zeit & Tage, Essen & Trinken, Haus & Kleidung, Eigenschaften & Farben, Mehr Eigenschaften, Stadt & Verkehr, Natur & Tiere, Nützliche Nomen — each with its own translated subtitle ("numbers · 3/14"). 54 duplicates were left out; question words, two separable verbs, body parts and five clock words live in their own decks |
| W-Wörter | 38 | all German question words: wer/wen/wem/wessen, the wie-combinations (wie viel(e), wie lange, wie oft, wie spät …), warum/wieso/weshalb/wozu, and every wo(r)-compound (womit, worauf, woran, worüber …) — each with an example sentence and a grammar note |
| Trennbare Verben | 16 | separable verbs (abfahren, anrufen, aufwachen, einsteigen, umziehen …) — every card's example sentence shows the prefix split, with English translation and a "trennbar: ich rufe … an" note |
| Körperteile | 21 | body parts (Kopf, Auge, Hand, Fuß, Herz …) with example sentences, translations and the plural form as the tip (die Hände, die Füße, die Zähne …) |
| Partizip II | 44 | the perfect-tense participles of the essential irregular verbs, learned as chunks with their auxiliary baked in: 14 sein-verbs first (ist gegangen, ist geblieben, ist aufgestanden …), then 30 haben-verbs (hat gegessen, hat genommen, hat verstanden …). Every card has a Perfekt example sentence with translation and the full principal parts in the note (gehen – ging – gegangen · Perfekt mit sein), plus the classic traps: kein ge- for ver-/be- verbs, ge- in the middle of separable verbs, Partizip = Infinitiv (bekommen), and ist gefallen vs. hat gefallen |
| Zeit & Uhr | 34 | telling the time and everything around clocks: units (Sekunde/Minute/Stunde), the tricky patterns (halb drei = 2:30!, Viertel vor/nach, Punkt acht Uhr, kurz vor zwölf), clocks themselves (Wecker, Armbanduhr, Kuckucksuhr, Sanduhr, Zeiger, Zifferblatt), punctuality (pünktlich, Verspätung, sich verspäten, Frist) and idioms (rund um die Uhr, höchste Zeit, eine Ewigkeit) — die Uhr, Stunde, Minute, halb and Viertel moved here from the Band I decks |
| Melancholie & Sehnsucht | 59 | literary sorrow & longing vocabulary as found in German literature — Wehmut, Schwermut, Weltschmerz, Sehnsucht, Herzeleid, Zähre, sich grämen …: each card has an example sentence with English translation and a register note (gehoben, poetisch, veraltet), plus word-family tips (der Gram → sich grämen, die Wehmut → wehmütig) |
| Länder (5 decks) | 113 | German country names, grouped by region under their own "Länder" section: Europa (20), Osteuropa incl. the Caucasus (24), Amerika (20), Afrika (21), Asien & Ozeanien (28). Every card has an example sentence with English translation and a note with the country adjective (deutsch, türkisch, aserbaidschanisch …); countries that take an article — die Schweiz, die Türkei, die Ukraine, der Iran, die USA, die Niederlande … — show the correct forms (in die Schweiz, im Iran, in den USA) |

### Notes on the *Sätze & Floskeln* cards

Each card's note keeps the extra context from the book:

- **hören** — a phrase the street says *to you* (cashier, conductor, loudspeaker)
- **sagen** — your line
- no tag — flows both ways
- **Norddeutsch** — Bremen/Hamburg specials

## Project structure

```
index.html            the whole app (UI, styles, data packs, logic)
api/ai.js             Vercel serverless proxy for the AI features
manifest.webmanifest  PWA manifest
sw.js                 service worker (offline cache)
icons/                favicon + home-screen icons
```

Study keyboard shortcuts: `Space` flips the card, `1`–`4` = Nochmal / Schwer / Gut / Leicht, `←` = Nochmal, `→` = Gut.
