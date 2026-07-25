# SyncStream

Standalone synchronized video watching app for Chrome. It runs with a local Node.js server for room state, WebSocket sync, chat, and WebRTC signaling.

## Prerequisites

- Node.js 20 or newer

## Run Locally

```bash
npm install
npm run dev
```

Open Chrome at:

```text
http://localhost:3000
```

## Production Build

```bash
npm run build
npm start
```

The production server also runs at `http://localhost:3000` unless you set a different `PORT`.

## GitHub Pages

This repo includes a GitHub Actions workflow that publishes the static Chrome preview to GitHub Pages on every push to `main`.

```text
https://aashishdhiman9.github.io/SyncStream/
```

The Pages build uses static preview mode because GitHub Pages cannot run the Node.js WebSocket server.

## Notes

- No external AI API key or hosted studio account is required.
- Screen sharing uses Chrome's built-in `getDisplayMedia` permission prompt.
- Multi-user sync requires every user to reach the same running server URL.
