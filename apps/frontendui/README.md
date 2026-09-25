# OpenRDB Studio

Desktop PostgreSQL client built with **Tauri 2**, **React**, and **Rust**.

## Prerequisites

- Node.js 20+
- Rust (stable) + Cargo
- macOS: Xcode Command Line Tools

## Run (desktop GUI)

```bash
cd apps/frontendui
npm install
npm run tauri:dev
```

This starts the Vite frontend and opens the native Tauri window.

## Frontend only (browser)

```bash
cd apps/frontendui
npm run dev
```

Note: database features require the Tauri shell (`tauri:dev`). The browser build cannot talk to the Rust backend.

## Build

```bash
cd apps/frontendui
npm run tauri build
```

## Features

- Save PostgreSQL **server connections** (URI + friendly name); passwords in the OS keychain
- Expand a connection to browse **databases** on that server (Compass-style tree)
- Create databases under an existing connection
- Browse tables, view/edit data (respects read-only mode)
- Structure view for columns / keys
- SQL editor with Format, Export CSV, auto-limit, multi-tabs
- ERD view with real foreign-key relationships
- **Atlas deep links** (`openrdb://connect?...`) to import connections from the Atlas projects dashboard

## Atlas deep links

Atlas can open Studio with a connection prefilled:

```
openrdb://connect?host=...&port=5432&user=...&password=...&database=...&ssl=1&name=...
```

- Requires the Tauri app (`npm run tauri:dev` or an installed build), not the browser-only Vite preview.
- On macOS, custom URL schemes are registered for **bundled/installed** apps; use a release build or install the `.app` to test from the browser.
- On Linux/Windows, schemes register at runtime in debug builds.

## Project layout

- `src/` — React UI
- `src-tauri/` — Rust / Tauri backend (sqlx + Postgres)
