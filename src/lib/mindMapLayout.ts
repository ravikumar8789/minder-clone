import type { LayoutNode, MindNodeRow, TreeNode } from '../types/mindMap'

const MARGIN_X = 48
const LEVEL_DX = 200
const LEAF_STEP = 48
const ROOT_H = 44
const ROOT_MIN_W = 180
const CHILD_H = 34
const R_CIRCLE = 6
const TEXT_GAP = 10

export const ROOT_SURFACE = '#e8e8e6'
export const ROOT_STROKE = '#c4c4be'

/** Branch stroke / accent colors (Minder-style warm palette). */
export const BRANCH_PALETTE = [
  '#d74b3b',
  '#e07c2e',
  '#c9a227',
  '#4a8fbf',
  '#7b68b5',
  '#4a9f6c',
]

function estimateRootW(title: string) {
  return Math.max(ROOT_MIN_W, 56 + Math.min(title.length, 48) * 8)
}

function estimateChildW(title: string) {
  return Math.max(100, R_CIRCLE * 2 + TEXT_GAP + Math.min(title.length, 60) * 7 + 16)
}

let nextLeafY: number

function layoutNode(n: TreeNode, depth: number, branchColor: string): LayoutNode {
  const ln = n as LayoutNode
  ln.depth = depth
  ln.branchColor = branchColor
  ln.x = MARGIN_X + depth * LEVEL_DX

  if (n.children.length === 0) {
    ln.y = nextLeafY
    nextLeafY += LEAF_STEP
    ln.w = depth === 0 ? estimateRootW(n.title) : estimateChildW(n.title)
    ln.h = depth === 0 ? ROOT_H : CHILD_H
    return ln
  }

  for (let i = 0; i < n.children.length; i++) {
    const c = n.children[i]
    const col =
      depth === 0 ? BRANCH_PALETTE[i % BRANCH_PALETTE.length] : branchColor
    layoutNode(c, depth + 1, col)
  }

  const centers = n.children.map((c) => {
    const L = c as LayoutNode
    return L.y + L.h / 2
  })
  const mid = (Math.min(...centers) + Math.max(...centers)) / 2
  ln.h = depth === 0 ? ROOT_H : CHILD_H
  ln.w = depth === 0 ? estimateRootW(n.title) : estimateChildW(n.title)
  ln.y = mid - ln.h / 2
  return ln
}

export function buildTree(rows: MindNodeRow[]): TreeNode | null {
  if (rows.length === 0) return null
  const byId = new Map<string, TreeNode>()
  for (const r of rows) {
    byId.set(r.id, { ...r, children: [] })
  }
  let root: TreeNode | null = null
  for (const r of rows) {
    const n = byId.get(r.id)!
    if (!r.parent_id) {
      root = n
    } else {
      byId.get(r.parent_id)?.children.push(n)
    }
  }
  if (!root) return null
  for (const n of byId.values()) {
    n.children.sort((a, b) => a.sort_order - b.sort_order)
  }
  return root
}

export function layoutMindMap(root: TreeNode): LayoutNode {
  nextLeafY = 36
  const colored = layoutNode(root, 0, ROOT_STROKE)
  colored.branchColor = ROOT_SURFACE
  return colored
}

export function flattenLayout(root: LayoutNode): LayoutNode[] {
  const out: LayoutNode[] = []
  function walk(n: LayoutNode) {
    out.push(n)
    n.children.forEach((c) => walk(c as LayoutNode))
  }
  walk(root)
  return out
}

/** Auto-layout, then apply saved `pos_x` / `pos_y` from the DB when present. */
export function layoutMindMapFromTree(root: TreeNode): LayoutNode {
  const laid = layoutMindMap(root)
  for (const n of flattenLayout(laid)) {
    if (n.pos_x != null && n.pos_y != null) {
      n.x = n.pos_x
      n.y = n.pos_y
    }
  }
  return laid
}

export function getLayoutBounds(flat: LayoutNode[]) {
  let maxR = 0
  let maxB = 0
  let minL = Infinity
  let minT = Infinity
  for (const n of flat) {
    minL = Math.min(minL, n.x)
    minT = Math.min(minT, n.y)
    maxR = Math.max(maxR, n.x + n.w)
    maxB = Math.max(maxB, n.y + n.h)
  }
  const pad = 80
  return {
    width: Math.max(400, maxR - minL + pad * 2),
    height: Math.max(300, maxB - minT + pad * 2),
    offsetX: minL - pad,
    offsetY: minT - pad,
  }
}

/** Cubic Bézier with horizontal bias (Minder-like curves). */
export function bezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string
) {
  const dx = Math.max(40, (x2 - x1) * 0.45)
  const c1x = x1 + dx
  const c2x = x2 - dx
  return {
    d: `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`,
    stroke: color,
  }
}

export function exitAnchor(n: LayoutNode): { x: number; y: number } {
  return { x: n.x + n.w, y: n.y + n.h / 2 }
}

/** Incoming edge meets the hollow circle on the left. */
export function entryAnchor(n: LayoutNode): { x: number; y: number } {
  if (n.depth === 0) return { x: n.x, y: n.y + n.h / 2 }
  return { x: n.x + R_CIRCLE, y: n.y + n.h / 2 }
}

export { R_CIRCLE, TEXT_GAP }
