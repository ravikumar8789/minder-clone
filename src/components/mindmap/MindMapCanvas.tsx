import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { LayoutNode } from '../../types/mindMap'
import {
  R_CIRCLE,
  ROOT_STROKE,
  ROOT_SURFACE,
  TEXT_GAP,
  bezierPath,
  entryAnchor,
  exitAnchor,
  flattenLayout,
  getLayoutBounds,
} from '../../lib/mindMapLayout'

const DRAG_THRESHOLD_PX = 5

function clientToWorld(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement,
  t: { pan: { x: number; y: number }; scale: number; offX: number; offY: number }
) {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const v = pt.matrixTransform(ctm.inverse())
  return {
    x: t.offX + (v.x - t.pan.x) / t.scale,
    y: t.offY + (v.y - t.pan.y) / t.scale,
  }
}

type Props = {
  root: LayoutNode
  selectedId: string | null
  editingId: string | null
  editDraft: string
  onEditDraftChange: (v: string) => void
  onSelect: (id: string | null) => void
  onCommitTitle: (nodeId: string, title: string) => void
  onCancelEdit: () => void
  pan: { x: number; y: number }
  scale: number
  onCanvasPanStart: (clientX: number, clientY: number) => void
  onBeginEdit: (nodeId: string, title: string) => void
  onNodePositionCommit: (nodeId: string, x: number, y: number) => void
  viewWidth: number
  viewHeight: number
}

export function MindMapCanvas({
  root,
  selectedId,
  editingId,
  editDraft,
  onEditDraftChange,
  onSelect,
  onCommitTitle,
  onCancelEdit,
  pan,
  scale,
  onCanvasPanStart,
  onBeginEdit,
  onNodePositionCommit,
  viewWidth,
  viewHeight,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const transformRef = useRef({
    pan,
    scale,
    offX: 0,
    offY: 0,
  })

  const flatBase = useMemo(() => flattenLayout(root), [root])
  const bounds = useMemo(() => getLayoutBounds(flatBase), [flatBase])

  const [liveDrag, setLiveDrag] = useState<null | { id: string; x: number; y: number }>(
    null
  )

  const dragSessionRef = useRef<null | {
    id: string
    grabX: number
    grabY: number
    startClientX: number
    startClientY: number
  }>(null)
  const dragMovedRef = useRef(false)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    transformRef.current = {
      pan,
      scale,
      offX: bounds.offsetX,
      offY: bounds.offsetY,
    }
  }, [pan, scale, bounds.offsetX, bounds.offsetY])

  const flat = useMemo(() => {
    if (!liveDrag) return flatBase
    return flatBase.map((n) =>
      n.id === liveDrag.id ? { ...n, x: liveDrag.x, y: liveDrag.y } : n
    )
  }, [flatBase, liveDrag])

  const byId = useMemo(() => new Map(flat.map((n) => [n.id, n])), [flat])

  const onBgMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return
      const t = e.target as HTMLElement
      if (t.closest('[data-node="1"]')) return
      onSelect(null)
      onCanvasPanStart(e.clientX, e.clientY)
    },
    [onSelect, onCanvasPanStart]
  )

  useEffect(() => {
    function onMove(e: globalThis.PointerEvent) {
      const sess = dragSessionRef.current
      if (!sess) return
      const dx = e.clientX - sess.startClientX
      const dy = e.clientY - sess.startClientY
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        dragMovedRef.current = true
      }
      const svg = svgRef.current
      if (!svg) return
      const w = clientToWorld(e.clientX, e.clientY, svg, transformRef.current)
      if (!w) return
      setLiveDrag({
        id: sess.id,
        x: w.x - sess.grabX,
        y: w.y - sess.grabY,
      })
    }

    function onUp(e: globalThis.PointerEvent) {
      const sess = dragSessionRef.current
      if (!sess) return
      dragSessionRef.current = null
      const svg = svgRef.current
      const moved = dragMovedRef.current
      dragMovedRef.current = false

      if (moved && svg) {
        suppressClickRef.current = true
        const w = clientToWorld(e.clientX, e.clientY, svg, transformRef.current)
        if (w) {
          const x = w.x - sess.grabX
          const y = w.y - sess.grabY
          onNodePositionCommit(sess.id, x, y)
        }
      }
      setLiveDrag(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [onNodePositionCommit])

  const handleNodePointerDown = useCallback(
    (e: ReactPointerEvent<SVGGElement>, n: LayoutNode) => {
      if (e.button !== 0) return
      if (editingId === n.id) return
      const el = e.target as Element
      if (el.closest?.('input, textarea, [data-no-drag="1"]')) return

      e.stopPropagation()
      const svg = svgRef.current
      if (!svg) return
      const w = clientToWorld(e.clientX, e.clientY, svg, transformRef.current)
      if (!w) return
      dragMovedRef.current = false
      dragSessionRef.current = {
        id: n.id,
        grabX: w.x - n.x,
        grabY: w.y - n.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
      }
      setLiveDrag({ id: n.id, x: n.x, y: n.y })
      onSelect(n.id)
    },
    [editingId, onSelect]
  )

  const vw = Math.max(1, viewWidth)
  const vh = Math.max(1, viewHeight)

  return (
    <svg
      ref={svgRef}
      className="mind-svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="none"
      onMouseDown={onBgMouseDown}
    >
      <defs>
        <filter id="mind-selected-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#4a90d9" floodOpacity="0.5" />
        </filter>
      </defs>
      <rect
        x={0}
        y={0}
        width={vw}
        height={vh}
        fill="#fafaf8"
        className="mind-svg-bg"
      />
      <g transform={`translate(${pan.x},${pan.y}) scale(${scale}) translate(${-bounds.offsetX},${-bounds.offsetY})`}>
        <g className="mind-edges">
          {flat.map((n) => {
            if (!n.parent_id) return null
            const p = byId.get(n.parent_id)
            if (!p) return null
            const a = exitAnchor(p)
            const b = entryAnchor(n)
            const { d, stroke } = bezierPath(a.x, a.y, b.x, b.y, n.branchColor)
            return (
              <path
                key={`e-${n.id}`}
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={2}
                strokeLinecap="round"
              />
            )
          })}
        </g>
        <g className="mind-nodes">
          {flat.map((n) => (
            <MindMapNodeEl
              key={n.id}
              n={n}
              selected={n.id === selectedId}
              editing={n.id === editingId}
              editDraft={editDraft}
              onEditDraftChange={onEditDraftChange}
              onSelect={() => onSelect(n.id)}
              onBeginEdit={() => onBeginEdit(n.id, n.title)}
              onCommitTitle={(t) => onCommitTitle(n.id, t)}
              onCancelEdit={onCancelEdit}
              onPointerDown={(e) => handleNodePointerDown(e, n)}
              suppressClickRef={suppressClickRef}
            />
          ))}
        </g>
      </g>
    </svg>
  )
}

function MindMapNodeEl({
  n,
  selected,
  editing,
  editDraft,
  onEditDraftChange,
  onSelect,
  onBeginEdit,
  onCommitTitle,
  onCancelEdit,
  onPointerDown,
  suppressClickRef,
}: {
  n: LayoutNode
  selected: boolean
  editing: boolean
  editDraft: string
  onEditDraftChange: (v: string) => void
  onSelect: () => void
  onBeginEdit: () => void
  onCommitTitle: (title: string) => void
  onCancelEdit: () => void
  onPointerDown: (e: ReactPointerEvent<SVGGElement>) => void
  suppressClickRef: MutableRefObject<boolean>
}) {
  const strokeSel = selected ? '#4a90d9' : n.depth === 0 ? ROOT_STROKE : n.branchColor
  const sw = selected ? 2.5 : n.depth === 0 ? 1 : 1.5

  const guardClick = (e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      e.preventDefault()
      e.stopPropagation()
      return true
    }
    return false
  }

  if (n.depth === 0) {
    return (
      <g
        data-node="1"
        transform={`translate(${n.x},${n.y})`}
        onPointerDown={onPointerDown}
        style={{ cursor: editing ? 'default' : 'grab' }}
      >
        <rect
          width={n.w}
          height={n.h}
          rx={10}
          ry={10}
          fill={ROOT_SURFACE}
          stroke={strokeSel}
          strokeWidth={sw}
          filter={selected ? 'url(#mind-selected-glow)' : undefined}
          className="mind-node-root-bg"
          onClick={(e) => {
            if (guardClick(e)) return
            e.stopPropagation()
            onSelect()
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onBeginEdit()
          }}
        />
        {selected ? (
          <rect
            x={n.w - 10}
            y={4}
            width={6}
            height={6}
            fill="#fff"
            stroke="#4a90d9"
            strokeWidth={1}
            className="mind-node-handle"
            data-no-drag="1"
          />
        ) : null}
        <circle cx={22} cy={n.h / 2} r={4} fill="#888" opacity={0.35} />
        {editing ? (
          <foreignObject x={34} y={8} width={n.w - 44} height={n.h - 16}>
            <div className="mind-foreign-inner" data-no-drag="1">
              <input
                className="mind-node-input mind-node-input-root"
                value={editDraft}
                autoFocus
                onChange={(e) => onEditDraftChange(e.target.value)}
                onBlur={() => onCommitTitle(editDraft.trim() || 'Topic')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') onCancelEdit()
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </foreignObject>
        ) : (
          <text
            x={34}
            y={n.h / 2 + 5}
            className="mind-node-text mind-node-text-root"
            onClick={(e) => {
              if (guardClick(e)) return
              e.stopPropagation()
              onSelect()
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onBeginEdit()
            }}
          >
            {n.title}
          </text>
        )}
      </g>
    )
  }

  const cx = n.x + R_CIRCLE
  const cy = n.y + n.h / 2
  const tx = n.x + R_CIRCLE * 2 + TEXT_GAP

  return (
    <g
      data-node="1"
      onPointerDown={onPointerDown}
      style={{ cursor: editing ? 'default' : 'grab' }}
    >
      <rect
        x={n.x - 4}
        y={n.y - 2}
        width={n.w + 8}
        height={n.h + 4}
        rx={6}
        fill={selected ? 'rgba(74, 144, 217, 0.18)' : 'transparent'}
        stroke="none"
        className="mind-node-hit"
        onClick={(e) => {
          if (guardClick(e)) return
          e.stopPropagation()
          onSelect()
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onBeginEdit()
        }}
      />
      <circle
        cx={cx}
        cy={cy}
        r={R_CIRCLE}
        fill="#fff"
        stroke={n.branchColor}
        strokeWidth={sw}
      />
      {selected ? (
        <rect
          x={n.x + n.w - 12}
          y={n.y - 2}
          width={6}
          height={6}
          fill="#fff"
          stroke="#4a90d9"
          strokeWidth={1}
          data-no-drag="1"
        />
      ) : null}
      {editing ? (
        <foreignObject x={tx} y={n.y + 4} width={n.w - (R_CIRCLE * 2 + TEXT_GAP)} height={n.h - 8}>
          <div className="mind-foreign-inner" data-no-drag="1">
            <input
              className="mind-node-input"
              value={editDraft}
              autoFocus
              onChange={(e) => onEditDraftChange(e.target.value)}
              onBlur={() => onCommitTitle(editDraft.trim() || '…')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') onCancelEdit()
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </foreignObject>
      ) : (
        <text
          x={tx}
          y={cy + 5}
          className="mind-node-text"
          fill="#2a2a28"
          onClick={(e) => {
            if (guardClick(e)) return
            e.stopPropagation()
            onSelect()
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onBeginEdit()
          }}
        >
          {n.title}
        </text>
      )}
    </g>
  )
}
