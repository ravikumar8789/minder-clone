import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  createChildNode,
  deleteNode,
  fetchMindMap,
  fetchNodes,
  updateMindMapTitle,
  updateNodePosition,
  updateNodeTitle,
} from '../data/mindMapQueries'
import {
  buildTree,
  flattenLayout,
  getLayoutBounds,
  layoutMindMapFromTree,
} from '../lib/mindMapLayout'
import type { MindNodeRow } from '../types/mindMap'
import { MindMapCanvas } from '../components/mindmap/MindMapCanvas'
import { MindMapToolbar } from '../components/mindmap/MindMapToolbar'

export function MindMapEditorPage() {
  const { id: mapId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)

  const [docTitle, setDocTitle] = useState('')
  const [rows, setRows] = useState<MindNodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null
  )

  const [viewSize, setViewSize] = useState({ w: 800, h: 600 })

  const load = useCallback(async () => {
    if (!mapId || !user) return
    setLoading(true)
    setError(null)
    const { map, error: me } = await fetchMindMap(mapId)
    if (me || !map) {
      setLoading(false)
      setError(me?.message ?? 'Map not found.')
      return
    }
    if (map.user_id !== user.id) {
      setLoading(false)
      setError('You do not have access to this map.')
      return
    }
    setDocTitle(map.title)
    const { nodes, error: ne } = await fetchNodes(mapId)
    setLoading(false)
    if (ne) {
      setError(
        ne.message.includes('relation') || ne.message.includes('does not exist')
          ? 'Run the mind map section of querry.md in Supabase, then refresh.'
          : ne.message
      )
      setRows([])
      return
    }
    setRows(nodes)
  }, [mapId, user])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setViewSize({ w: Math.floor(r.width), h: Math.floor(r.height) })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setViewSize({ w: Math.floor(r.width), h: Math.floor(r.height) })
    return () => ro.disconnect()
  }, [])

  const layoutRoot = useMemo(() => {
    const tree = buildTree(rows)
    if (!tree) return null
    return layoutMindMapFromTree(tree)
  }, [rows])

  const flat = useMemo(
    () => (layoutRoot ? flattenLayout(layoutRoot) : []),
    [layoutRoot]
  )

  const rootId = useMemo(() => rows.find((r) => !r.parent_id)?.id ?? null, [rows])

  const canDeleteSelected = useMemo(() => {
    if (!selectedId || !rootId) return false
    if (selectedId === rootId) return false
    return true
  }, [selectedId, rootId])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current
      if (!d) return
      setPan({
        x: d.px + (e.clientX - d.x),
        y: d.py + (e.clientY - d.y),
      })
    }
    function onUp() {
      dragRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const handleDeleteNode = useCallback(async () => {
    if (!selectedId || !rootId || selectedId === rootId) return
    setError(null)
    const toRemove = selectedId
    const { error: err } = await deleteNode(toRemove)
    if (err) {
      setError(err.message)
      return
    }
    setSelectedId(null)
    setRows((prev) => prev.filter((r) => r.id !== toRemove))
  }, [selectedId, rootId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (editingId) return
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      if (canDeleteSelected && selectedId) {
        e.preventDefault()
        void handleDeleteNode()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canDeleteSelected, selectedId, editingId, handleDeleteNode])

  const onCanvasPanStart = (clientX: number, clientY: number) => {
    dragRef.current = { x: clientX, y: clientY, px: pan.x, py: pan.y }
  }

  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    setScale((s) => Math.min(2.2, Math.max(0.35, s + delta)))
  }

  const zoomFit = useCallback(() => {
    if (!layoutRoot) return
    const b = getLayoutBounds(flat)
    const vw = viewSize.w
    const vh = viewSize.h
    const sx = (vw * 0.9) / b.width
    const sy = (vh * 0.9) / b.height
    const s = Math.min(sx, sy, 1.35)
    setScale(s)
    setPan({ x: (vw - b.width * s) / 2, y: (vh - b.height * s) / 2 })
  }, [layoutRoot, flat, viewSize.w, viewSize.h])

  const didAutoFitRef = useRef(false)
  useEffect(() => {
    didAutoFitRef.current = false
  }, [mapId])

  useEffect(() => {
    if (!layoutRoot || flat.length === 0 || didAutoFitRef.current) return
    if (viewSize.w < 80) return
    didAutoFitRef.current = true
    queueMicrotask(() => zoomFit())
  }, [layoutRoot, flat.length, viewSize.w, zoomFit])

  const onDocTitleCommit = async (title: string) => {
    if (!mapId) return
    setDocTitle(title)
    const { error: err } = await updateMindMapTitle(mapId, title)
    if (err) setError(err.message)
  }

  const onAddChild = async () => {
    if (!mapId || !layoutRoot || !rootId) return
    setError(null)
    const parentId = selectedId ?? rootId
    const siblings = rows.filter((r) => r.parent_id === parentId)
    const sortOrder =
      siblings.length === 0
        ? 0
        : Math.max(...siblings.map((s) => s.sort_order)) + 1
    const { node, error: err } = await createChildNode(
      mapId,
      parentId,
      'New branch',
      sortOrder
    )
    if (err) {
      setError(err.message)
      return
    }
    if (node) {
      setRows((prev) => [...prev, node])
      setSelectedId(node.id)
    }
  }

  const onCommitNodeTitle = async (nodeId: string, title: string) => {
    setEditingId(null)
    const { error: err } = await updateNodeTitle(nodeId, title)
    if (err) {
      setError(err.message)
      return
    }
    setRows((prev) => prev.map((r) => (r.id === nodeId ? { ...r, title } : r)))
  }

  const onBeginEdit = (nodeId: string, title: string) => {
    setSelectedId(nodeId)
    setEditingId(nodeId)
    setEditDraft(title)
  }

  const onNodePositionCommit = useCallback(
    async (nodeId: string, x: number, y: number) => {
      setError(null)
      const { error: err } = await updateNodePosition(nodeId, x, y)
      if (err) {
        setError(
          err.message.includes('column') && err.message.includes('pos_')
            ? 'Add pos_x / pos_y to mind_nodes (see querry.md), then try again.'
            : err.message
        )
        return
      }
      setRows((prev) =>
        prev.map((r) => (r.id === nodeId ? { ...r, pos_x: x, pos_y: y } : r))
      )
    },
    []
  )

  if (!mapId) return <p className="mind-editor-error">Invalid map.</p>

  if (loading) {
    return (
      <div className="mind-editor mind-editor-loading">
        <p>Loading map…</p>
      </div>
    )
  }

  if (error && !layoutRoot) {
    return (
      <div className="mind-editor mind-editor-error">
        <p>{error}</p>
        <Link to="/">← All maps</Link>
      </div>
    )
  }

  if (!layoutRoot) {
    return (
      <div className="mind-editor mind-editor-error">
        <p>This map has no root node.</p>
        <Link to="/">← All maps</Link>
      </div>
    )
  }

  return (
    <div className="mind-editor">
      <MindMapToolbar
        docTitle={docTitle}
        onDocTitleCommit={onDocTitleCommit}
        onBack={() => navigate('/')}
        onAddChild={() => void onAddChild()}
        onDeleteNode={() => void handleDeleteNode()}
        onZoomFit={zoomFit}
        canDeleteNode={canDeleteSelected}
      />
      <div className="mind-tab-strip">
        <span className="mind-tab mind-tab-active">{docTitle}</span>
      </div>
      {error ? <div className="mind-inline-err">{error}</div> : null}
      <div
        className="mind-viewport"
        ref={viewportRef}
        onWheel={onWheel}
        role="presentation"
      >
        <MindMapCanvas
          root={layoutRoot}
          selectedId={selectedId}
          editingId={editingId}
          editDraft={editDraft}
          onEditDraftChange={setEditDraft}
          onSelect={setSelectedId}
          onBeginEdit={onBeginEdit}
          onCommitTitle={onCommitNodeTitle}
          onCancelEdit={() => setEditingId(null)}
          pan={pan}
          scale={scale}
          onCanvasPanStart={onCanvasPanStart}
          onNodePositionCommit={onNodePositionCommit}
          viewWidth={viewSize.w}
          viewHeight={viewSize.h}
        />
      </div>
      <p className="mind-hint">
        Drag nodes to move · Drag empty canvas to pan · Ctrl+scroll to zoom · Double-click to rename
      </p>
    </div>
  )
}
