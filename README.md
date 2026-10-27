# DigiFarm

B2B agricultural sourcing marketplace for Ghana — an installable PWA built with Next.js.
Plan, decisions and status: [docs/ROADMAP.md](docs/ROADMAP.md).

## Run it locally

Requirements: Node 20.9+, pnpm, and a `.env` (copy `.env.example`; use a Neon **branch**, never production).

```bash
pnpm install
pnpm db:migrate     # apply migrations to the dev database
pnpm db:seed        # reference data (operating zones)
pnpm dev            # http://localhost:3000
```

Create a staff account (staff can't sign up through the website):

```bash
pnpm admin:create --email you@example.com --name "Your Name" --role ADMIN
```

In development, emails aren't sent: they're printed in the `pnpm dev` output and saved in `.storage/outbox/` (open the link from there to verify an account).

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test   # unit + integration (uses TEST_DATABASE_URL)
pnpm test:e2e                              # Playwright: desktop, Android (Pixel), iPhone (WebKit)
```

PWA checks need a production build (the service worker is off in `next dev`):

```bash
pnpm build && pnpm start -p 3001
PWA_BASE_URL=http://localhost:3001 pnpm test:e2e --project=desktop-chrome e2e/pwa.spec.ts
```

## Test on a phone or simulator

- **iOS Simulator:** open `http://localhost:3000` in Safari. To install, run a production build, then Share → Add to Home Screen.
- **Same Wi-Fi:** `pnpm dev:lan`, then open your Mac's IP on port 3000 (layout checks only — install needs HTTPS).
- **Full PWA on a real phone:** `pnpm dev:tunnel` (needs `cloudflared`) for an HTTPS link.

See ROADMAP §2.6 for Android Emulator steps.
