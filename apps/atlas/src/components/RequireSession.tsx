import { Navigate, Outlet } from 'react-router-dom'
import { getSession } from '@/lib/session'

export function RequireSession() {
  const session = getSession()
  if (!session) {
    return <Navigate to="/sign-in" replace state={{ from: '/projects' }} />
  }
  return <Outlet />
}
