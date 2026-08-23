# QRTrack

**Create. Scan. Track.**

QRTrack is a personal dynamic QR campaign manager. It creates public tracking links, renders customizable print-ready QR templates, records real scans through Netlify Functions, redirects scanners to editable destinations, and presents campaign analytics without demo data.

## Technology

- React 19, TypeScript, TanStack Start, and Vite
- Tailwind CSS 4 plus a custom responsive design system
- `qr-code-styling` and `qrcode` for live QR rendering and raw exports
- Chart.js for real scan analytics
- Netlify Functions for public redirects and workspace APIs
- Netlify Database with Drizzle ORM for campaigns and scan events
- Browser storage for the personal login session, appearance, and workspace identity

## Key Flows

- Create a campaign with a validated HTTP or HTTPS destination.
- Save a permanent slug such as `/r/abc123xyz` and encode that public URL in the QR.
- Edit the destination later without changing the printed QR.
- Record a scan before issuing the HTTP redirect.
- Estimate unique visitors with anonymous identifiers and record coarse Netlify geolocation when available.
- Deactivate deleted campaigns so their public links show an inactive page instead of redirecting.
- Export and import campaigns, design settings, and available analytics as JSON.

## Local Development

```bash
pnpm install
netlify dev --port 8889
```

Open `http://localhost:8889`. Netlify Dev is required to emulate Functions and the managed database integration.

Local tracking URLs cannot be scanned from another physical device. The UI displays this limitation and requires a Netlify deployment for public QR links.

## Deployment

Deploy the repository as a Netlify site. The included `netlify.toml` defines the build output and Functions directory. Netlify Database is provisioned automatically on first connection, and the migration in `netlify/database/migrations/` is applied during deployment.

Set the public environment variable below to the site's canonical production origin:

```text
PUBLIC_APP_URL=https://your-site.netlify.app
```

When this variable is absent, deployed QR links use the current site origin. Never set it to localhost in production.

## Personal Login Notice

The sign-in system intentionally identifies a local personal workspace only. Account records and password hashes remain in browser storage, while campaign and scan records are stored server-side under the generated workspace ID. This is not server-grade authentication and should not be represented as such.

## Open Tracking

QRTrack reliably records visits to its redirect URL. It does not claim that an external destination page fully loaded, so external landing-page opens remain unavailable unless a future verifiable integration is added.
