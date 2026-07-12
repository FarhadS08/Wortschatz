# Wortschatz — Moin, Deutsch!

A German flashcard app: single page, no build step, installable on your phone, works offline.



## Use it everywhere

- **Install as an app**: the site is a PWA — on Android/Chrome use *Add to Home Screen / Install*,
  on iOS Safari use *Share → Add to Home Screen*. It launches standalone with its own icon.
- **Offline**: a service worker caches the app; your words are stored in `localStorage` on the device.
- **Responsive**: layouts for small phones (320 px+), notched screens (safe areas), landscape, tablet and desktop.

> Words are stored in the browser (localStorage) and can additionally sync between devices with an account — see below.

## Accounts & sync

The app has built-in accounts ("Konto & Sync" via the cloud button in the header): register once, log in on each device, and your words plus the full learning progress sync automatically — the deck is pulled when the app opens and pushed ~1.5 s after every change; the newest state wins.

You stay logged in via a secure (`HttpOnly`) session cookie that renews itself for 90 days on every visit — even if the browser clears local storage, the app logs itself back in and restores the deck from the server.

## Features

- **Spaced repetition (SM-2)** — the Anki-style algorithm: four grades (Nochmal / Schwer / Gut / Leicht) with the projected interval shown on each button, learning steps for new cards (1/10 min), growing review intervals (interval × per-card ease factor, with fuzz), and lapse handling (failed reviews drop into relearning with a reduced interval and ease). Decks from the previous Leitner version migrate automatically with progress preserved
- **Topics with deck states** — all deck controls live in a collapsible "Decks & Runden" bar with a live summary ("12/31 aktiv · 10 · Mix"), keeping the study screen focused on the card; expand it to toggle categories on/off with the chips; every chip carries a mini progress bar (green = learned & in repetition, amber = currently learning, grey = untouched), a ✓ once no new words remain, and the exact breakdown as a tooltip
- **Rounds ("Pro Runde")** — practice in chunks of 5 / 10 / 15 / 25 cards instead of everything at once; the done screen shows how many cards are still due and starts the next chunk
- **Smart round composition ("Modus")** — rounds are dealt deterministically, not randomly: overdue reviews first, then cards in learning, then new words in book order; words you finished this sitting don't repeat in the next rounds; the counter shows the mix ("3 fällig + 7 neu"); switch the mode to Mix / Neue / Fällige
- **Learn state for new words** — cards you have never studied are presented first (word, translation, example and note all visible) before they get quizzed later in the same round; "Kenn ich schon" skips a known word straight to a 4-day interval
- **Repeat & drill** — "Diese Runde wiederholen" runs the same words again as an ungraded practice round (your schedule stays untouched); in the word list, "Auswählen" lets you hand-pick any words and start them as a real learning round or a drill
- **Unlimited words & own decks** — add your own words in the *+ Neu* tab, and create your own categories with the dashed *+ Thema* chip (empty decks persist, sync with your account, and can be removed again via their ×)
- **AI assist** — type just the German word and the AI fills in the article, translation, example sentence (with English translation) and a grammar note
- **App language (🌐, top right)** — not every German learner knows English or German: the whole interface (tabs, buttons, states, toasts, forms — 157 strings) switches between 17 languages: Deutsch, English, Türkçe, Azərbaycanca, Русский, Español, Français, Italiano, Português, Polski, Українська, Nederlands, Ελληνικά, Čeština, Română, Magyar and Svenska. For non-English/German languages the word meanings and example translations are also localized: generated in one batched AI call per round via `api/ai.js` and cached on the device (falls back to English without the AI server). The choice syncs with your account
- **Example translations** — cards with an example sentence show its English translation right below it
- **Browse decks & word details** — the word list filters by deck (chip row on top) *and by learning state* (Alle / Neue / Am Lernen / Gelernt / Fällige), combined with search; when a deck is selected, a coverage header shows its total, progress bar and clickable state counts — so you can verify at a glance that every word of a deck has been covered (deck chip numbers in the study view jump straight there). Tapping a word unfolds its full record: learning status with next review, color-coded article, example sentence with translation, tip and deck — plus controls to reset it to new, mark it as learned, or edit it
- **Streak & daily goal** — a slim strip above the deck shows your 🔥 day streak (any day with at least one graded card keeps it alive), a daily-goal ring (tap to cycle 10/20/30/50 cards) with a confetti moment when you reach it, and your 🏆 record streak; all of it syncs with your account

## Built-in categories

| Category | Cards | Source |
|---|---|---|
| Meine Wörter | 9 | starter words |
| Adjektive | 16 | common adjectives |
| Präpositionen | 14 | prepositions with case notes |
| Sätze & Floskeln (11 decks) | 421 | *Moin, Deutsch! Band II* everyday phrases, split along the book's chapters into 11 decks of 30–44 cards: Grüßen & Höflichkeit, Reaktionen & Meinung, Smalltalk & Sätze, Füllwörter & Ausrufe, Hilfe & Pläne, Bäcker & Kasse, Restaurant & Bahn, Wege & Zahlen, Arzt & Amt, Telefon & Arbeit, Wohnung & Feste — each chip's subtitle shows its place ("everyday phrases · 7/11") |
| Grundwortschatz (14 decks) | 600 | *Moin, Deutsch!* Band I word list, split thematically into 14 decks of 35–54 cards: Erste Wörter, Kleine Wörter, Zahlen, Alltagsverben, Mehr Verben, Menschen & Arbeit, Zeit & Tage, Essen & Trinken, Haus & Kleidung, Eigenschaften & Farben, Mehr Eigenschaften, Stadt & Verkehr, Natur & Tiere, Nützliche Nomen ("core vocabulary · 3/14" subtitles). 54 duplicates were left out; question words, two separable verbs and body parts live in their own decks |
| W-Wörter | 38 | all German question words: wer/wen/wem/wessen, the wie-combinations (wie viel(e), wie lange, wie oft, wie spät …), warum/wieso/weshalb/wozu, and every wo(r)-compound (womit, worauf, woran, worüber …) — each with an example sentence and a grammar note |
| Trennbare Verben | 16 | separable verbs (abfahren, anrufen, aufwachen, einsteigen, umziehen …) — every card's example sentence shows the prefix split, with English translation and a "trennbar: ich rufe … an" note |
| Körperteile | 21 | body parts (Kopf, Auge, Hand, Fuß, Herz …) with example sentences, translations and the plural form as the tip (die Hände, die Füße, die Zähne …) |

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
