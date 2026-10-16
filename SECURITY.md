# Love Arcade Security Policy

## Report a vulnerability

If you discover a security issue, do **not** publish personal data, access tokens, or reproduction steps that compromise other players. Contact the repository owner privately using a responsible-disclosure channel.

## Live multiplayer security

The default production room transport uses **Cloudflare Workers + SQLite-backed Durable Objects**. Each two-player room has a server-authoritative game reducer; neither browser can issue arbitrary snapshots as an authenticated game move. The server sends seat-specific state that hides unrevealed answers, choices, card faces and predictions.

- Room codes are **six numeric digits**, but are **not credentials**.
- The host receives an unguessable 256-bit secret and a separate invite secret. The host secret is **never included** in shareable invitations.
- A guest with a private invite secret can claim the vacant seat. A guest with only the numeric code must be **approved by the room host**.
- On first admission, a guest receives a new session secret for reconnection. The original invite secret cannot displace an admitted guest.
- A single authoritative Durable Object admits at most two authenticated seats; extra sockets are bounded, with room-creation rate limiting.
- Game state, a bounded list of recent chat messages, and room metadata are temporarily stored server-side. Rooms expire after six hours of inactivity (hard maximum 24 hours), or earlier when the host ends the room.
- Allowed browser origins are restricted, but **CORS and Origin checks are not authentication**; application tokens and host approval provide actual room authorization.
- Tokens are held in sessionStorage to allow reconnection. Do not store them in localStorage, logs, analytics, screenshots, chat messages, or shared host links. Private invite tokens are placed in the URL fragment, not the HTTP query string.

These protections do not identity-verify players, defend compromised endpoints, guarantee availability under an outage, or provide end-to-end encryption for data processed by the room server.

## Voice calling

Optional voice calls still use PeerJS/WebRTC and may fail behind restrictive carrier-grade NATs or firewalls. A managed voice provider or TURN relay is needed for consistent cross-network audio. Cloudflare only handles nonmedia signaling for voice; microphone audio is not intentionally sent through the game server.

## Legacy connection fallback

A temporary `?transport=peer` compatibility path keeps the previous PeerJS data connection available for rollback. It is **less reliable across networks** and **does not have the same server-side token authorization**. It should be retired after real-world rollout and voice transport migration are complete.

## Credentials and deployment

Never commit API tokens or Cloudflare credentials. The GitHub Actions Cloudflare deployment job reads `CLOUDFLARE_API_TOKEN` from a repository secret. Restrict the token to the intended Cloudflare account with the minimum required deployment permissions, rotate exposed tokens, and use branch protection / deployment review where available.

## Testing and limitations

GitHub Actions exercises the game engine, privacy masking, room code and token helpers, local Cloudflare WebSocket admission/approval, chat delivery, reconnection, mobile browser gameplay, and static security/SEO checks. Run real-device, cross-network voice and privacy tests before treating the project as production hardened. Review [Privacy](./privacy.html) and [Cloudflare documentation](./cloudflare/README.md) before changing the backend.
