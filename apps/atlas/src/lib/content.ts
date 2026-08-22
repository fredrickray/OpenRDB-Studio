export const GITHUB_RELEASES_URL =
  'https://github.com/fredrickray/OpenRDB-Studio/releases/latest'

export const GITHUB_REPO_URL = 'https://github.com/fredrickray/OpenRDB-Studio'

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
    note: 'Apple Silicon & Intel',
    icon: 'apple',
  },
  {
    id: 'windows',
    name: 'Windows',
    note: 'Windows 10+',
    icon: 'windows',
  },
  {
    id: 'linux',
    name: 'Linux',
    note: 'AppImage & .deb',
    icon: 'linux',
  },
] as const
