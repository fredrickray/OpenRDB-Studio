# OpenRDB Atlas

Web hub for [OpenRDB Studio](../frontendui/): marketing, downloads, and a local projects dashboard.

## Run locally

```bash
cd apps/atlas
npm install
npm run dev
```

Opens at [http://localhost:5174](http://localhost:5174).

## Routes

| Path | Purpose |
|------|---------|
| `/` | Marketing + download |
| `/sign-in` | Local profile (name + email in `localStorage`) |
| `/projects` | Staging / production projects |
| `/projects/new` | Paste a Postgres connection string |

Projects and session data stay in the browser. Nothing is synced to a server yet.

## Open in Studio

Project cards build an `openrdb://connect?...` deep link. With Studio installed (or `npm run tauri:dev` on macOS after a bundled install), the desktop app imports the connection.

If Studio does not open, download it from the landing page and try again.

## Build

```bash
npm run build
npm run preview
```

Static output goes to `dist/`. Deploy to Vercel, Netlify, or GitHub Pages.

## Links

Update release and repo URLs in `src/lib/content.ts` when needed.
