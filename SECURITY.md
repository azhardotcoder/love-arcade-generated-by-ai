# Security Policy

Love Arcade is a simple, static, two-player hobby application.

## Responsible reports

If you discover a security vulnerability, **do not publish exploit instructions or personal information** in a public issue. Contact the repository owner privately through GitHub if a private contact route is available.

## Security model

Rooms are unlisted and identified by a randomly generated 12-character code. **Possession of the code grants access** to a vacant session. Do not treat the room as an authenticated, end-to-end-identity-verified secure space.

The host validates game actions and sends filtered snapshots to guests. The guest cannot use ordinary game actions to reveal hidden cards or secret answers. The host is trusted and can examine its own game state.

PeerJS is used for signaling and WebRTC for direct data/media transport. Where restrictive NAT or firewalls prevent connectivity, the app may fail rather than safely falling back to a dedicated TURN service.

Browser features are gated by HTTPS; microphone consent is required. The site declares Vercel response security headers in `vercel.json`.

## Please avoid storing secrets

Never send passwords, identity documents, financial information or private security tokens through game chat, love notes or voice.

## Scope of automated checks

GitHub Actions currently exercises normal game behavior, important invalid actions, hidden-state masking, SEO/static configuration, mobile Chromium rendering, basic WCAG checks, and a simulated two-player session. Real-world penetration testing, third-party infrastructure reviews, device-specific voice tests and high-volume load testing remain separate work.
