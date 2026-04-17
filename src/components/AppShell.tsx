import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()

  return (
    <div className="shell">
      <header className="shell-header">
        <Link to="/" className="shell-logo">
          Minder
        </Link>
        <div className="shell-actions">
          <span className="shell-email" title={user?.email ?? ''}>
            {user?.email}
          </span>
          <button type="button" className="btn ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="shell-main">{children}</main>
    </div>
  )
}
