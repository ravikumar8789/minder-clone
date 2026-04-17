import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createMindMap, deleteMindMap, fetchMindMaps } from '../data/mindMapQueries'
import type { MindMap } from '../types/mindMap'

export function HomePage() {
  const { user } = useAuth()
  const [maps, setMaps] = useState<MindMap[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { maps: rows, error: err } = await fetchMindMaps(user.id)
    setLoading(false)
    if (err) {
      setError(
        err.message.includes('relation') || err.message.includes('does not exist')
          ? 'Mind map tables are missing. Run the mind map section in querry.md, then refresh.'
          : err.message
      )
      setMaps([])
      return
    }
    setMaps(rows)
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate() {
    if (!user) return
    setError(null)
    setCreating(true)
    const title = `Map-${new Date().toISOString().slice(0, 10)}.minder`
    const { map, error: err } = await createMindMap(user.id, title)
    setCreating(false)
    if (err) {
      setError(err.message)
      return
    }
    if (map) setMaps((prev) => [map, ...prev])
  }

  async function onDeleteMap(id: string, title: string) {
    if (!window.confirm(`Delete “${title}”?`)) return
    setError(null)
    const { error: err } = await deleteMindMap(id)
    if (err) {
      setError(err.message)
      return
    }
    setMaps((prev) => prev.filter((m) => m.id !== id))
  }

  if (loading) {
    return (
      <div className="page-narrow">
        <p className="muted">Loading maps…</p>
      </div>
    )
  }

  return (
    <div className="page-narrow">
      <div className="page-head">
        <h1 className="page-title">Mind maps</h1>
        <button
          type="button"
          className="btn primary"
          onClick={() => void onCreate()}
          disabled={creating}
        >
          {creating ? 'Creating…' : 'New map'}
        </button>
      </div>

      {error ? <p className="banner-error">{error}</p> : null}

      {maps.length === 0 && !error ? (
        <p className="muted empty-hint">No maps yet. Create one to open the canvas.</p>
      ) : null}

      <ul className="board-list">
        {maps.map((m) => (
          <li key={m.id} className="board-list-item">
            <Link to={`/map/${m.id}`} className="board-link">
              {m.title}
            </Link>
            <button
              type="button"
              className="btn icon danger"
              aria-label={`Delete ${m.title}`}
              onClick={() => void onDeleteMap(m.id, m.title)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
