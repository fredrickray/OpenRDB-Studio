const SESSION_KEY = 'openrdb-atlas-session'

export interface Session {
  name: string
  email: string
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.name?.trim() || !parsed?.email?.trim()) return null
    return parsed
  } catch {
    return null
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      name: session.name.trim(),
      email: session.email.trim().toLowerCase(),
    })
  )
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function isSignedIn(): boolean {
  return getSession() !== null
}
