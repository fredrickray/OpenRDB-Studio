# OpenRDB Atlas

Web hub for [OpenRDB Studio](../frontendui/): marketing, downloads, projects, and Neon database provisioning.

## Run locally

You need two processes for full Create with Neon support:

```bash
# Terminal 1 — API (Neon key stays here)
cd apps/atlas-api
cp .env.example .env   # set NEON_API_KEY from https://console.neon.tech/app/settings/api-keys
npm install
npm run dev            # http://localhost:8787

# Terminal 2 — Atlas UI
cd apps/atlas
npm install
npm run dev            # http://localhost:5174 (proxies /api → 8787)
```

Without the API (or without `NEON_API_KEY`), you can still paste existing connection strings.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Marketing + download |
| `/sign-in` | Local profile (name + email in `localStorage`) |
| `/projects` | Staging / production projects |
| `/projects/new` | **Create with Neon** or paste a Postgres URL |

## Create with Neon

1. Set `NEON_API_KEY` in `apps/atlas-api/.env`
2. Start the API and Atlas UI
3. New project → **Create with Neon** → choose staging or production
4. Atlas creates a Neon project (staging also gets a `staging` branch) and saves the connection string locally
5. **Open in Studio** uses `openrdb://connect?...`

Project metadata still lives in the browser for this phase. Cloud auth/sync comes later.

## Open in Studio

Deep links need the desktop app installed (or a bundled build on macOS). See the Studio README.

## Build

```bash
npm run build
npm run preview
```

Static UI goes to `dist/`. Deploy Atlas separately from `atlas-api` (API needs a host that can keep `NEON_API_KEY` secret).
