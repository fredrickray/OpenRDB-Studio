const STORAGE_KEY = 'openrdb-saved-queries'
const MAX_SAVED = 50

export interface SavedQuery {
    id: string
    name: string
    sql: string
    savedAt: string
}

export function saveQueryLocally(tab: { id: string; name: string; sql: string }): void {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as SavedQuery[]
    const entry: SavedQuery = {
        id: tab.id,
        name: tab.name,
        sql: tab.sql,
        savedAt: new Date().toISOString(),
    }
    const next = [entry, ...existing.filter((e) => e.id !== tab.id)].slice(0, MAX_SAVED)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
