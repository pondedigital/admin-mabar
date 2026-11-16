# PONDE CLICK — Admin Mabar Badminton

A mobile-first admin app for managing badminton _mabar_ (main bareng / social play) sessions. It handles the whole flow of a session in one place: player attendance, balanced match-making with a queue system, court assignment, score tracking, standings, per-player billing, and a session finance report — all shareable as JPG or printable as PDF.

Built with React Router v8 (SSR), React 19, TypeScript, and Tailwind CSS v4.

## Features

The app has four tabs, plus a session settings sheet and a menu in the header.

### 🔐 Sign-in (Gmail + password)

- Accounts are created by the PONDE admin in the Supabase dashboard; there is no public sign-up.
- Only Gmail addresses are accepted.
- Old username accounts move to Gmail once via **Pindahkan ke Gmail** on the login screen (same account, PBs and history kept).
- A new account with no PB creates its own PB on first sign-in and becomes its admin.
- Setup and operations: [docs/auth-gmail.md](docs/auth-gmail.md).

### Header

- PB name, date and GOR. Tap it (or the settings icon) to open **Pengaturan sesi**: PB switch, GOR name, session date, number of courts, payment mode, shuttlecock price, base fee / all-in fee. Changes save automatically.
- Menu: **Akhiri mabar** (locks the session) and **Keluar**. A closed session shows **Mulai mabar baru**; its data stays viewable and exportable.

### 👥 Pemain (Players)

- Add players (with roster suggestions) and set their level: **Pemula (C)**, **Menengah (B)**, or **Mahir (A)**.
- Tap a name to toggle attendance (_hadir / tidak hadir_); change level or delete per row.
- Players who have already played cannot be deleted — mark them as absent instead.

### 🏸 Main (Matches)

- **Lapangan**: one card per court with score inputs, shuttlecock (_kok_) counter, delete, and **Selesai & simpan skor** (needs a score). An empty court offers a one-tap start for the first ready queued match.
- **Antrean**: start a queued match on any free or chosen court, swap individual players, or cancel it.
- **Buat pertandingan**: auto-pair 1–4 balanced queued matches (see [criteria](#auto-pairing-criteria)), or pick 2–4 players manually and start now or add to the queue.

### 🏆 Hasil (Results)

- **Riwayat**: finished matches, shuttlecocks used, and games played per player.
- **Klasemen**: live leaderboard: played, wins, losses, point difference (see [criteria](#leaderboard-ranking-criteria)).

### 💰 Kas (Money)

- **Tagihan**: per-player bill with paid status (Cash / QRIS / Transfer) and manual price adjustment; export as **JPG** or **print to PDF**.
- **Keuangan**: expenses (shuttlecocks by tube / piece, court rental, other) and the finance report ending with the final balance (_saldo akhir_); export as JPG.

## Feature Criteria & Rules

### Auto-pairing criteria

The match generator ([app/lib/pairing.ts](app/lib/pairing.ts)) searches all 4-player combinations from the players with the fewest games and only accepts a match when **all** of these hold:

1. **Minimum players** — at least 4 present players are required.
2. **Level balance** — each player's level has a score (Pemula = 1, Menengah = 2, Mahir = 3); the difference between the two teams' total level scores must be **at most 1**.
3. **Play-count fairness** — after the match is formed, the gap between the most-played and least-played present player must be **at most 1** game. Play count includes finished matches, active matches, already-queued matches, and a _pairing offset_. Players currently on court are exempt from this check (unless they're in the combination) so they can't block free players from filling an empty court.

From all valid combinations, the winner is chosen by priority:

1. **Fewest busy players** — combinations that can play immediately on an empty court beat ones that must wait for an active match to finish.
2. **Lowest total play count** — players who have played the least go first.
3. **Fewest dependencies** — combinations tied to the fewest active matches / earlier queue entries, so a queued match becomes playable as soon as one court frees up.
4. **Random pick** among the remaining ties.

When generating multiple queue entries at once, the generator retries up to 15 times from scratch and keeps the attempt that produced the most matches.

### Late-arrival / re-attendance criteria

- A **newly added player** gets a pairing offset equal to the current minimum play count, so they're treated as even with the group instead of monopolizing the queue to "catch up".
- A player toggled back to **present** is levelled up to at least the current minimum play count for the same reason.
- Marking a player absent removes them from selection and from any queued match.

### Court assignment criteria

- Active matches are limited by the configured number of courts (_numCourts_).
- New matches take the **lowest-numbered free court**; queued matches can also be started on a specific court if it's free.
- A queued match cannot start while any of its players is still in an active match.

### Match rules

- Manual match creation requires **2–4 selected players**; players in an active match cannot be selected.
- A match cannot be finished with a **0–0 score**.
- Each match starts with 1 shuttlecock; the count can be adjusted but never below 0.

### Leaderboard ranking criteria

Only **finished** matches count, and only players with at least 1 game appear. Ranking order:

1. **Most wins**
2. **Highest point difference** (_+/-_, the sum of score margins won minus margins lost) as tie-breaker

### Billing criteria (payment modes)

- **`lapangan_kok` mode** — each present player pays the base fee plus a share of shuttlecock cost: for every match, `shuttlecocks × shuttlecock price` is split evenly among that match's players.
- **`all_in` mode** — every present player pays a flat all-in fee regardless of games played.
- Either way, a manual **per-player adjustment** (positive or negative) can be applied on top.

### Finance criteria

- **Total collected** = sum of all players' bills (including adjustments).
- **Total expenses** = shuttlecock tubes (`qty × price`) + individual shuttlecocks (`qty × price`) + court rental + other expenses.
- **Final balance (saldo akhir)** = total collected − total expenses.

## Tech Stack

- [React Router v8](https://reactrouter.com/) — full-stack React framework with SSR
- [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) + tw-animate-css
- [lucide-react](https://lucide.dev/) — icons
- [html2canvas-pro](https://github.com/yorickshan/html2canvas-pro) — JPG export of receipts and reports

## Project Structure

```
app/
├── components/
│   ├── MabarApp.tsx           # Auth gate, 4-tab shell
│   ├── auth/                  # Login + legacy claim, create-PB onboarding
│   ├── layout/                # Header, bottom navigation, full-screen states
│   ├── settings/              # Session settings sheet
│   ├── pemain/                # Players tab
│   ├── pertandingan/          # Main tab (courts, queue, match creation)
│   ├── hasil/                 # Hasil tab (history, leaderboard)
│   ├── kas/                   # Kas tab (bill receipt, expenses, finance report)
│   ├── modals/                # Alert/confirm, price adjustment, image preview
│   └── ui/                    # Shared button, field, segmented control, overlay
├── context/MabarContext.tsx   # App state, actions & derived calculations
├── lib/
│   ├── auth.ts, email.ts      # Gmail sign-in and legacy account claim
│   ├── services/              # Supabase data access
│   ├── pairing.ts             # Balanced auto-pairing algorithm
│   ├── match.ts               # Team-splitting & queue helpers
│   └── format.ts              # Formatting helpers
├── hooks/                     # JPG export, persisted UI state
└── types/                     # Domain and DB types
supabase/migrations/           # SQL to run in the Supabase SQL editor
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Type Checking

```bash
npm run typecheck
```

## Building for Production

```bash
npm run build
npm run start   # serve the production build
```

### Docker Deployment

```bash
docker build -t admin-mabar .
docker run -p 3000:3000 admin-mabar
```

The build output:

```
build/
├── client/    # Static assets
└── server/    # Server-side code
```
