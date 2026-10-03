# Gomoku 五子棋

A small, offline-first **five-in-a-row** game. Play against a friend on the
same device, or against a built-in computer opponent at three difficulty
levels. It runs entirely in the browser with no build step, no server, and no
network — open `index.html` and play.

## Play

- **Goal:** be the first to line up **five stones in a row** — horizontally,
  vertically, or diagonally. Black always moves first.
- Tap or click an intersection to place a stone. Players alternate turns.
- The last move is marked with a coral dot; the winning five are ringed in green.

## Modes

- **Two players** — pass-and-play on one device.
- **Computer** — pick a difficulty and whether you take Black (first) or White:
  - **Easy** — looks for immediate wins and usually blocks, with some randomness.
  - **Medium** — handles forced wins/blocks and searches a couple of moves ahead.
  - **Hard** — deeper alpha-beta search with threat detection.

Choose your options, then press **New game** to start. **Undo** takes back your
last move (and the computer's reply in single-player), and **Restart** clears the
current board while keeping your settings. The running win tally and the game in
progress are saved on your device automatically.

## Install as an app

The game is a Progressive Web App. When served over HTTPS (or `localhost`):

- **iPhone / iPad (Safari):** Share → **Add to Home Screen**.
- **Android (Chrome):** menu → **Install app** / **Add to Home screen**.
- **Desktop (Chrome/Edge):** the install icon in the address bar.

Once installed it launches full-screen and works offline. Updates are picked up
automatically the next time you open it online.

## Run locally

Open `index.html` directly in a browser, or serve the folder to enable the
service worker and installability:

```powershell
python -m http.server 8000
```

Then visit `http://127.0.0.1:8000/`.

## Tests

Open `tests.html` in a browser to run the engine and AI regression suite. All
checks must report **PASS**.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, PWA metadata, service-worker registration |
| `styles.css` | Styling and responsive layout |
| `game.js` | Pure game logic (board, moves, win detection, save/restore) — no DOM |
| `ai.js` | Computer opponent (heuristics + alpha-beta search) |
| `app.js` | UI: rendering, input, controls, persistence |
| `tests.html` / `tests.js` | Browser regression suite |
| `sw.js` | Service worker (offline cache, network-first) |
| `manifest.webmanifest` | PWA manifest |
| `icons/` | App icons |

Game logic is deliberately separated from rendering, and the vendored libraries
are kept unmodified. See `THIRD_PARTY.md` for dependency licenses.
