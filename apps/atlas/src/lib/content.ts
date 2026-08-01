export const GITHUB_RELEASES_URL =
  'https://github.com/fredrickray/OpenRDB-Studio/releases/latest'

export const GITHUB_REPO_URL = 'https://github.com/fredrickray/OpenRDB-Studio'

/** Stable asset names produced by .github/workflows/release.yml */
export const RELEASE_DOWNLOAD_BASE =
  'https://github.com/fredrickray/OpenRDB-Studio/releases/latest/download'

export const features = [
  {
    icon: 'server',
    title: 'Server connections',
    description:
      'Save PostgreSQL server connections with friendly names. Passwords stay in your OS keychain.',
  },
  {
    icon: 'tree',
    title: 'Database explorer',
    description:
      'Expand connections to browse databases in a Compass-style tree. Create new databases inline.',
  },
  {
    icon: 'table',
    title: 'Table browsing',
    description:
      'View and edit row data with a clean grid. Respect read-only mode when you need it.',
  },
  {
    icon: 'columns',
    title: 'Structure view',
    description:
      'Inspect columns, types, and keys at a glance without leaving the workspace.',
  },
  {
    icon: 'code',
    title: 'SQL editor',
    description:
      'Multi-tab editor with formatting, CSV export, and auto-limit for safe exploration.',
  },
  {
    icon: 'diagram',
    title: 'ERD view',
    description:
      'Visualize tables and real foreign-key relationships across your schema.',
  },
] as const

export const platforms = [
  {
    id: 'macos',
    name: 'macOS',
    note: 'Apple Silicon .dmg (Intel build on releases page)',
    icon: 'apple',
    downloadUrl: `${RELEASE_DOWNLOAD_BASE}/OpenRDB-Studio-macos-aarch64.dmg`,
  },
  {
    id: 'windows',
    name: 'Windows',
    note: 'Windows 10+ installer',
    icon: 'windows',
    downloadUrl: `${RELEASE_DOWNLOAD_BASE}/OpenRDB-Studio-windows-x64.exe`,
  },
  {
    id: 'linux',
    name: 'Linux',
    note: 'AppImage (x64)',
    icon: 'linux',
    downloadUrl: `${RELEASE_DOWNLOAD_BASE}/OpenRDB-Studio-linux-amd64.AppImage`,
  },
] as const
