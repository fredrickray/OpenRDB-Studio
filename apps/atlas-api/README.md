# Atlas API

Small backend that provisions Postgres databases on [Neon](https://neon.tech) for OpenRDB Atlas.

The Neon API key stays on the server — never in the browser.

## Setup

1. Create a free Neon account and an [API key](https://console.neon.tech/app/settings/api-keys).
2. Copy env template:

```bash
cd apps/atlas-api
cp .env.example .env
# edit .env and set NEON_API_KEY=...
```

3. Install and run:

```bash
npm install
npm run dev
```

API listens on [http://localhost:8787](http://localhost:8787).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health + whether Neon is configured |
| GET | `/api/provision/status` | `{ available: boolean }` |
| POST | `/api/provision` | Body: `{ name, environment: "staging" \| "production" }` → connection URI |
| DELETE | `/api/provision/:neonProjectId` | Delete the Neon project |

## Atlas UI

Run Atlas (`apps/atlas`) with the Vite proxy (default). On **New project**, choose **Create with Neon**.
