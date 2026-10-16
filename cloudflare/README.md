# Cloudflare multiplayer backend (staged migration)

This folder contains the **server-authoritative multiplayer backend** for Love Arcade. It is currently a **staged migration**, not the production connection path. The existing Vercel frontend continues to use PeerJS until the Cloudflare Worker has been deployed, checked, and a client migration is explicitly enabled.

## Account and Worker

- Cloudflare account ID: `133da2bd551cfcc3dd4e1a7aa9e10cd3` (public identifier, **not a secret**)
- Existing Worker name: `love-arcade-server`
- Expected hostname: `https://love-arcade-server.azhardotcoder.workers.dev`
- Configuration: [`wrangler.jsonc`](../wrangler.jsonc)
- Durable Objects: SQLite-backed `ArcadeRoom` and `CreateLimiter`
- Source: [`worker.mjs`](./worker.mjs)

## Deployment access: what the owner must do

**Never paste API tokens in chat or commit them to GitHub.**

1. Open Cloudflare **My Profile → API Tokens → Create Token**. Choose the recommended **Edit Cloudflare Workers** template (or a custom token with the required permissions for this Worker and Durable Objects), limited to the correct account.
2. Open the GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**.
3. Create the secret **`CLOUDFLARE_API_TOKEN`** with the token value. Only the user enters the token; the assistant does not need to see it.
4. From the repository's **Actions** tab, run the manual workflow **Deploy Cloudflare Room Server**. This targets the existing `love-arcade-server` Worker.
5. Verify `https://love-arcade-server.azhardotcoder.workers.dev/health` returns a JSON object whose `ok` property is `true`.

The dedicated deployment workflow is **manual only** and never publishes automatically on `main`. The existing Vercel frontend will not switch networking merely because the Worker is deployed.

## API and authentication

`GET /health`: unauthenticated health response.

`POST /api/rooms` with JSON `{"name":"Alice"}` and an approved `Origin` header: returns a six-digit `code`, random 256-bit `hostToken`, one-time `inviteToken`, and `expiresAt`. This action is limited to 12 rooms per IP in ten minutes.

`GET /ws?room=123456` with a WebSocket Upgrade from an approved web origin. After connecting, clients send one JSON authentication message:

- Host: `{"type":"hello","role":"host","token":"<hostToken>","name":"Alice"}`.
- Guest with invite: `{"type":"hello","role":"guest","token":"<inviteToken>","name":"Bob"}`.
- Guest with the six-digit code only: `{"type":"hello","role":"guest","name":"Bob"}`; the host must approve the join request.

The guest receives a new long `sessionToken` on first admission, and should keep that token in **sessionStorage** for reconnection. Once admitted, the original `inviteToken` is not sufficient to take over the guest seat.

Authorized messages:
- `{"type":"action","action":{...}}`: validated with the existing `engine.mjs` reducer. The Worker persists the new state and broadcasts a **seat-specific** `state` snapshot, keeping unrevealed cards and predictions hidden.
- `{"type":"chat","id":"<32 lowercase hex>","text":"hello"}`: persisted in the last 80 messages, delivery acknowledged, sent to the other player.
- `{"type":"signal","event":"typing","payload":{...}}`: bounded and limited transient event types for watch reactions, drawing and voice signaling.
- `{"type":"ping"}`: responds with `pong` and a server time.
- `{"type":"approve","requestId":"<id>"}` or `reject`: host only, when someone joins by room code.
- `{"type":"leave"}`: guest vacates their seat; host closes the room.

Server events: `welcome`, `pending`, `join-request`, `presence`, `state`, `chat`, `chat-ack`, `signal`, `pong`, `error`.

Rooms expire after six hours of inactivity, subject to an absolute 24-hour limit. WebSocket Hibernation keeps inactive connections from continuously consuming billable duration. A closed tab can reconnect to the retained room using its long session token while the room is still alive.

## Frontend rollout (not yet switched)

1. Add a Cloudflare WebSocket client to the Vercel frontend, with token storage, host approval UI and automatic reconnect/resume.
2. Route game actions and chat to the Worker, and render its authoritative per-seat state rather than trusting the host browser.
3. Keep existing voice signaling separate; TURN or managed voice is still required to guarantee reliable voice calls across restrictive mobile networks.
4. Test two physical phones on different networks, including sharing invite links, approving code-only joins, each player reconnecting, stale actions, chat and all games.
5. Switch on the new transport only after those tests and production deployment verification. The existing PeerJS transport must remain available for rollback until then.

## Limits and security

The six-digit code is **not a password**. Only an unguessable invite token can admit a guest automatically; a code-only join requires host approval. Never put the host token in a shareable link or log it. There are at most two authenticated seats, with a separate bound for pending connections. HTTP and WebSocket origins are restricted to the configured allowed site(s), and create requests are rate-limited. CORS and Origin checks are a browser defense, **not a replacement for secrets, approval, or rate limits**.

The current Worker is the groundwork for the migration, not a claim that an endpoint is deployed or a long-distance multiplayer connection has been confirmed. No voice media is handled or recorded by this Worker.

## Local development

From the repository root:

```bash
npm install
npx wrangler dev --config wrangler.jsonc --local
```

Run `npm test` to exercise the pure protocol helpers and existing game engine. GitHub Actions also performs a Cloudflare Worker bundle dry run.
