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

- Save PostgreSQL connections (config on disk, passwords in the OS keychain)
- Browse tables, view/edit data (respects read-only mode)
- Structure view for columns / keys
- SQL editor with Format, Export CSV, auto-limit, multi-tabs
- ERD view with real foreign-key relationships

## Project layout

- `src/` — React UI
- `src-tauri/` — Rust / Tauri backend (sqlx + Postgres)
