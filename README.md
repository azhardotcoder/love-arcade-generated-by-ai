# Love Arcade 💗

A mobile-first **13-game, two-person romantic arcade** with a dedicated private room, shared games, Watch Together, chat, and optional voice. Created by **azhardotcoder**.

- **Play:** https://love-arcade-generated-by-ai.vercel.app/
- **Source:** https://github.com/azhardotcoder/love-arcade-generated-by-ai
- **Room backend health:** https://love-arcade-server.azhardotcoder.workers.dev/health

## Games

- **HeartSync:** ten secret-choice questions, predictions, playful reveal animations and a summary of shared wishes.
- **Touch the Same Star:** a five-round starry journey with Same Wish, Find My Star, Feel My Heart, and Our Constellation; save the finale as SVG.
- **Chess Royale:** legal moves, classic/rapid/blitz clocks, promotion, en passant, castling, takebacks, draws, resignation, rematches and PGN.
- **Truth or Dare:** partner-controlled approval, retry and skipping.
- **Love Quiz, Would You Rather?, Love Notes and Heart Match:** secret answers, reveals and cooperative memory play.
- **Love Pictionary, XOXO Battle, Spin the Love Bottle, Together We Escape, Dream Date Builder:** drawing/guessing, head-to-head play and cooperative romantic challenges.

**Watch Together** is a separate lounge activity rather than one of the 13 games. It uses the official YouTube IFrame Player API for a synchronized playlist, readiness checks, play/pause/seek, emoji reactions and chat. Embedded videos can be unavailable depending on YouTube's uploader settings, regional restrictions or policies.

## Default production networking

The production frontend is static on **Vercel** and connects each player independently to **Cloudflare Workers + Durable Objects** over secure WebSockets.

```text
Delhi phone -- WSS --> Cloudflare room Durable Object <-- WSS -- Mumbai phone
                           |
                   authoritative games
                    chat + presence
                    resumable state
```

- **Six-digit room codes** are easy to share but are not passwords.
- Hosts get a **private invite link** with an unguessable token in the URL fragment. Private invite links allow the first guest to claim the seat.
- A guest entering **only the numeric code** requests access; the host must approve.
- The authenticated seats are capped at two. Game actions are validated by `engine.mjs` on the server and only filtered per-seat snapshots are returned to each browser. Secrets are not sent as ordinary game-state data before reveals.
- Up to 80 recent chat messages and current room/game/watch state are temporarily stored in the room's Durable Object. Rooms expire six hours after inactivity, with a 24-hour maximum lifetime.
- An admitted browser keeps its temporary reconnect token in **sessionStorage** to restore the room after refreshes and temporary network loss. Leaving explicitly removes that credential.
- Automatic reconnection uses backoff. A backend outage or offline browser may still interrupt play; server-based messaging removes the dependency on direct phone-to-phone data connectivity, not dependency on the internet.
- **Voice is separate:** optional audio still uses PeerJS/WebRTC media. Some carrier/mobile networks require TURN relays that have **not** yet been configured. Games and chat can therefore work even when voice is unavailable.

The old PeerJS **game data transport** is preserved temporarily as `?transport=peer` for rollback/testing. It does not share room sessions or the Cloudflare-backed security model. On the local static-development origin, legacy transport remains the default; `?transport=cloudflare` explicitly enables the new backend.

## Architecture

| File | Role |
| --- | --- |
| `index.html`, `style.css`, `private-ui.css` | Responsive, accessible mobile-first app UI |
| `app.mjs` | Game rendering, actions, navigation and voice controls |
| `cloud-client.mjs` | Cloudflare authentication, private invitations, reconnection and WebSocket transport |
| `engine.mjs` | Shared, pure authoritative game-state reducer |
| `cloudflare/worker.mjs` | Room admission, state validation, chat, presence, retention and Durable Objects |
| `cloudflare/protocol.mjs` | Room-code, token and message validation |
| `wrangler.jsonc` | Cloudflare Worker and SQLite-backed Durable Object bindings |
| `.github/workflows/quality.yml` | Syntax, logic, bundle, accessibility and browser integration tests |
| `.github/workflows/deploy-cloudflare.yml` | Manual, secret-backed Worker deployment |

See [backend protocol and deployment setup](./cloudflare/README.md), [Security](./SECURITY.md), and [Privacy](./privacy.html).

## Local development

Node.js 22+ recommended for local Cloudflare tooling.

To run the legacy-compatible frontend alone:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

To test the real Cloudflare Durable Object locally, install dependencies and run two terminals:

```sh
npm install
npx wrangler@4 dev --config wrangler.jsonc --port 8788 --ip 127.0.0.1 --local
```

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4173/?transport=cloudflare&backend=http%3A%2F%2F127.0.0.1%3A8788
```

The backend-URL override works **only** on localhost. Production always uses the configured Cloudflare Worker URL.

## Testing

```sh
npm run check
npm test
npm run verify
```

GitHub Actions runs Node tests, server bundle checks, a live **local Worker WebSocket smoke test**, Chromium mobile UX and axe WCAG checks, two-browser game tests on the legacy transport, and separate **Cloudflare-backed two-browser tests** with real Durable Object room creation, host approval, private invite links, chat, games, and reload/reconnection. GitHub browser and integration tests do not replace testing on physical iOS/Android devices and distant mobile networks.

### Production rollout

1. Deploy the Worker using the manual GitHub Actions workflow with `CLOUDFLARE_API_TOKEN` stored only in GitHub Secrets.
2. Verify the Worker health URL and that its Durable Object binding is active.
3. Publish the **latest frontend commit** to Vercel production. A successful Cloudflare Worker deployment does **not** update the separate Vercel frontend. If Vercel Git integration is stale, reconnect GitHub or deploy the latest `main` revision explicitly.
4. Create a fresh room and test an invite link **between two physical phones on separate carriers/Wi-Fi networks**, then test code-only host approval, chat, games, refresh, reconnection, and closing the room.
5. Test optional voice independently. Integrate a managed voice service or TURN relay for reliable voice calls across restrictive networks.
6. Verify HTTPS, browser security headers, responsive layout, accessibility, Google Search Console and real-user performance.

## Security and privacy

Private links are bearer invitations, not identity verification. Do not share room URLs publicly; never share host credentials, passwords, documents, or private account details through chat. Cloudflare temporarily processes room/game/chat data, and audio transport is separate from the game server. This application does **not** advertise end-to-end encryption of server-handled data. See [Privacy & Safety](./privacy.html) and [Security Policy](./SECURITY.md).

## SEO

The site includes canonical metadata, semantic content, an Open Graph preview, JSON-LD for the free web game, robots.txt, and a sitemap. The creator is attributed to **azhardotcoder** without hidden keyword stuffing. Search visibility cannot be guaranteed without indexing and authority signals.
