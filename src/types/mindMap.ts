export type MindMap = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export type MindNodeRow = {
  id: string
  map_id: string
  parent_id: string | null
  title: string
  sort_order: number
  pos_x?: number | null
  pos_y?: number | null
  created_at: string
  updated_at: string
}

export type TreeNode = MindNodeRow & {
  children: TreeNode[]
}

export type LayoutNode = TreeNode & {
  x: number
  y: number
  w: number
  h: number
  depth: number
  branchColor: string
}
