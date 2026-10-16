# Cloudflare multiplayer backend (staged migration)

This folder contains the **server-authoritative multiplayer backend** for Love Arcade. The Worker is deployed and its health endpoint has been verified. The repository frontend now defaults to Cloudflare WebSockets on production domains, using `cloud-client.mjs`; the **public Vercel deployment must be updated to the latest GitHub commit** before visitors receive the new transport. Legacy PeerJS remains a temporary opt-in fallback for games, and optional audio still uses PeerJS/WebRTC.

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

The dedicated deployment workflow is **manual only** and never publishes automatically on `main`. The Vercel frontend must also be updated to a commit containing the new `cloud-client.mjs` integration; backend deployment alone does not change an older frontend.

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

## Frontend integration and release

The frontend implementation is in `cloud-client.mjs` and `app.mjs`. It creates private six-digit rooms, requests host approval for code-only joins, sends moves/chat to the authoritative Worker, restores state after reconnecting, and shares invite tokens only in URL fragments.

1. Verify the Worker health endpoint reports `ok:true`.
2. Publish the **latest GitHub `main` commit** on Vercel production.
3. Test both physical phones over different networks, then test refreshing each one, losing connectivity, host approval and the full game catalogue.
4. Voice signaling is sent via the Worker but optional voice **media still uses direct WebRTC** and may need a TURN relay.
5. If a frontend rollout needs rollback, `?transport=peer` opts into legacy PeerJS data transport for a **separate** legacy room, not the existing Cloudflare room.

### Local Cloudflare browser testing

```sh
npm install
npx wrangler@4 dev --config wrangler.jsonc --port 8788 --ip 127.0.0.1 --local
```

Serve the repository statically at `http://127.0.0.1:4173`, then open `/?transport=cloudflare&backend=http%3A%2F%2F127.0.0.1%3A8788` on two browser tabs. CI also runs real local Durable Object two-browser Playwright tests.

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
