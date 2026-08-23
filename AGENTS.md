# QRTrack Architecture

## Overview

QRTrack is a personal dynamic QR-code campaign manager built with TanStack Start, React, TypeScript, and Netlify. The browser owns the local personal login identity; Netlify Database owns durable campaign and scan data; Netlify Functions own all public tracking and server-side CRUD.

## Key Directories

- `src/app.tsx`: Main application shell, landing page, local login, dashboard, campaign manager, editor, analytics, and settings.
- `src/components/QRPreview.tsx`: Client-only QR rendering and the seven printable visual templates.
- `src/lib/auth.ts`: Browser-local account and session handling. Do not describe it as secure server authentication.
- `src/lib/data-service.ts`: Frontend persistence abstraction. UI code should call this module rather than fetch storage directly.
- `src/lib/types.ts`: Shared frontend campaign, event, template, and design types.
- `src/styles.css`: Theme tokens, responsive layouts, template artwork, and component states.
- `netlify/functions/qr-api.mts`: Workspace campaign CRUD, analytics clearing, deletion, and backup import.
- `netlify/functions/qr-redirect.mts`: Public `/r/:slug` lookup, scan recording, inactive/not-found pages, and redirect.
- `db/schema.ts`: Drizzle schema for campaigns and scan events.
- `netlify/database/migrations/`: Deploy-time database migrations.

## Data Decisions

- A campaign slug is immutable after creation. Destination edits must never regenerate it.
- Campaign deletion is a soft delete that also sets `active` to false so printed QR codes become inactive.
- Scan events are real server-side records. Never seed or synthesize analytics.
- Open events are only valid when technically verified. External redirect completion is not considered an open.
- Visitor IDs are anonymous estimates. Do not add personal identity collection.
- Structured records use Netlify Database. Browser storage is limited to local session, account, appearance, and workspace identity.

## Coding Conventions

- Use strict TypeScript and explicit domain types from `src/lib/types.ts`.
- Keep server storage logic out of React components.
- Use camelCase in TypeScript and snake_case database column names.
- Keep UI copy honest about local authentication and external open-tracking limitations.
- Preserve responsive behavior at 360px and above and maintain keyboard focus styles.
- Avoid fake data, dead controls, placeholder visuals, or unfinished navigation.

## Database Changes

Every schema change requires an accompanying migration:

```bash
pnpm exec drizzle-kit generate --name <imperative_snake_case_name>
```

Migration output must remain under `netlify/database/migrations/`.

## Public URL

`PUBLIC_APP_URL` is injected at build time for canonical production tracking links. When unset, the browser origin is used. Production values must be public HTTPS origins, never localhost.
