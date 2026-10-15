# Love Arcade 💗

A lightweight, mobile-first eleven-game date-night arcade for two players. Created by **azhardotcoder**.

**Live site:** https://love-arcade-generated-by-ai.vercel.app/  
**Repository:** https://github.com/azhardotcoder/love-arcade-generated-by-ai

## Features

- **Love Pictionary:** live shared drawing previews, private artist prompts, guess scoring, timed rounds, alternated roles.
- **XOXO Battle:** turn-based hearts-versus-kisses grid, outcome checks, scorekeeping and two-player rematches.
- **Spin the Love Bottle:** four challenge moods, synchronized reveal, partner approval/retry and skip.
- **Together We Escape:** four cooperative rooms with distinct clues, hints, answers and mutual progression.
- **Dream Date Builder:** five date stages, hidden independent selections and shared reveals.

- Chess Royale with legal chess.js moves, check/checkmate, castling, en passant, pawn promotion, rapid/blitz/classic clocks, takebacks, draw offers, resignation, rematches, move list and PGN export.
- Truth or Dare with server-like **host-authoritative** approval and turn switching, retry, and optional skip.
- Love Quiz, Would You Rather, secret Love Notes, and cooperative Heart Match.
- Two-person invite-only sessions using a 12-character room code and PeerJS WebRTC data channels.
- Session chat with delivery receipts and reconnect replay, optional voice, microphone mute, speaker mute, and hang-up.
- Online/offline/away awareness and responsive dark UI.
- SEO metadata, structured data, sitemap, robots, Open Graph preview, security headers, and progressive-web-app manifest.

## Watch Together

The **Together Lounge** is a shared YouTube watching experience, accessible within the existing two-player room. It is a separate room activity and **does not replace or add to the 11 playable games**.

- A shared video queue with up to 24 YouTube video links; both players may add, select, skip or remove videos.
- Both partners confirm **I'm ready** before the synchronized video starts.
- Host-authoritative synchronized play, pause, seek and position changes. The app estimates host/guest clock skew from room ping messages and periodically corrects playback drift.
- When a new video is selected, the ready-check resets. Reconnecting players receive the current queue, selected video, readiness state and host playback position.
- Live floating emoji reactions relay through the existing PeerJS room connection. Existing voice/chat controls remain accessible.
- Responsive player and watchlist UI, including a manual **Tap to start playback** fallback where mobile autoplay is blocked.

Playback uses the [official YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference). Each browser fetches authorized playback directly from YouTube: the Love Arcade host does not rebroadcast audio/video or bypass DRM. Only YouTube videos that permit embedding will play; YouTube may reject particular videos, geographic regions or age restrictions. Video playback may be approximate rather than frame-perfect, and voice/audio can be affected by browser autoplay and microphone rules.

The room stores the queue and playback state only in the host browser's memory. It is reset when the host closes/leaves the room. No account or permanent watchlist storage is implemented. See [Privacy & Safety](./privacy.html) for third-party data processing.

## Architecture

The site is static: `index.html`, `style.css`, and `app.mjs` are deployed to Vercel. `engine.mjs` holds pure game logic and is also imported by Node tests.

There is **no application database**. Chess move validation is performed by the room host. Both clients see synchronized board state, moves, results and clocks. The host remains authoritative for game timers; guest clock rendering accounts for approximate clock skew. The room host maintains game state and validates changes coming from the guest. WebRTC connections carry chat and game updates. PeerJS's public signaling infrastructure assists discovery; peer-to-peer connections sometimes require relay infrastructure depending on networking.

The host intentionally sends seat-specific snapshots. Unrevealed card faces and answers are not included in the guest's data messages. **This is not a cheat-proof competitive game**: the host controls game state and can inspect its own memory in developer tools.

## Run locally

Node.js 20+ recommended. Chess Royale loads the pinned BSD-2-Clause chess.js rules engine on demand when a player selects Chess.

```sh
python3 -m http.server 4173
```

Visit http://localhost:4173/. For voice on a remote device, use HTTPS; browsers permit microphone access only in secure contexts. The hosted Vercel origin uses HTTPS.

## Quality checks

```sh
npm run check
npm test
npm run verify
```

GitHub Actions runs syntax checks, Node regression tests, static SEO/security checks, Chromium mobile browser smoke tests, axe WCAG checks, and a simulated two-tab multiplayer integration test. The browser CI job installs pinned test tools independently of the deployed static app.

See [GitHub Actions](https://github.com/azhardotcoder/love-arcade-generated-by-ai/actions).

### Manual release checklist

1. Open the live Vercel URL on current Android Chrome, iOS Safari, desktop Chrome, Firefox, and Edge.
2. Create a room on one device and join via invite on a second device using **different networks** (Wi-Fi vs mobile).
3. Test every game, particularly retry/approve/skip turns and two-person reveals.
4. Test microphone permission allowed/denied, incoming/outgoing calls, mute/unmute, speaker mute, hang up, and network changes. Use headphones to avoid feedback.
5. Disconnect each partner separately, reconnect the guest, and confirm the host leaving clears the session.
6. Check page responsiveness at 320px, 375px, 768px, and desktop widths; test keyboard navigation and reduced motion.
7. Check Vercel production deployment, HTTPS response headers, real-user Core Web Vitals, indexing status and Google Search Console.

**Automated tests cannot guarantee** cross-carrier NAT traversal, voice hardware compatibility, browser media permission behavior, real-world latency, accessibility for every assistive technology, or Google indexing. Those require field testing and monitoring.

## Security and privacy

- Share a room code only with the intended partner; it is a **shared secret**, not authenticated user identity.
- No application login or permanent server-side conversation history is implemented.
- Chat and love notes are kept in memory while the browser session is open. Nicknames may be remembered in local storage, and a reconnect identifier in session storage.
- PeerJS signaling and WebRTC networking can expose connection metadata to providers; do not use the app for highly sensitive information.
- Do not add analytics, tracking, or unrestricted third-party assets without updating the privacy notice and verifying user consent where required.
- Security headers live in `vercel.json`. Inspect production headers after each release.

See [Privacy](./privacy.html) and [Security](./SECURITY.md).

## SEO

The canonical URL points to the Vercel domain. Metadata gives clear **creator attribution to azhardotcoder**, and JSON-LD describes the free web game. The sitemap has only the public landing page. Private room hash fragments must never become canonical pages. Do not stuff hidden keyword lists: Google ignores the deprecated keywords meta tag. To request indexing, verify domain ownership in Google Search Console and submit `/sitemap.xml`; rankings cannot be guaranteed.

## Limitations and roadmap

- A TURN server is not configured, so some restrictive networks cannot establish voice or direct data channels.
- Room state is held by the host tab; the room is lost when the host closes/reloads.
- No offline game mode: the app requires both browsers connected to play.
- Future improvements: self-hosted signaling/TURN, server-authoritative sessions and persistence with authentication, downloadable avatars, localization, optional keyboard shortcuts, PWA install flow, and real-device test matrix.
