# Wortschatz — Moin, Deutsch!

A simple, single-file German flashcard app. Open `wortschatz.html` in any browser — no build, no dependencies.

## Features

- **Spaced repetition** — Leitner-style boxes (repeat failed cards immediately; known cards come back after 1 / 3 / 7 / 21 days)
- **Topics** — toggle categories on/off with the chips above the card deck
- **Unlimited words** — add your own words in the *+ Neu* tab
- **AI assist** — type just the German word and the AI fills in the article, translation, example sentence and a grammar note (auto article detection with a suffix-rule fallback when offline). The AI calls need an environment that proxies `api.anthropic.com` (e.g. running as a claude.ai artifact); opened as a plain local file, the app falls back to the built-in suffix rules
- **Search & edit** — full word list with search, inline edit and delete

## Built-in categories

| Category | Cards | Source |
|---|---|---|
| Meine Wörter | 9 | starter words |
| Adjektive | 16 | common adjectives |
| Präpositionen | 14 | prepositions with case notes |
| Sätze & Floskeln | 421 | *Moin, Deutsch! Band II — Sätze & Floskeln* (everyday phrases, 23 chapters: greetings, small talk, bakery, checkout, restaurant, trains, doctor, Amt, phone, work, housing, occasions, Norddeutsch) |

### Notes on the *Sätze & Floskeln* cards

Each card's note keeps the extra context from the book:

- **hören** — a phrase the street says *to you* (cashier, conductor, loudspeaker)
- **sagen** — your line
- no tag — flows both ways
- **Norddeutsch** — Bremen/Hamburg specials

Study keyboard shortcuts: `Space` flips the card, `←`/`1` = again, `→`/`2` = knew it.
