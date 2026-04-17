import { supabase } from '../lib/supabase'
import type { MindMap, MindNodeRow } from '../types/mindMap'

function mapError(e: unknown): Error {
  if (e instanceof Error) return e
  return new Error(String(e))
}

export async function fetchMindMaps(userId: string): Promise<{
  maps: MindMap[]
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('mind_maps')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) return { maps: [], error: mapError(error.message) }
  return { maps: (data ?? []) as MindMap[], error: null }
}

export async function createMindMap(
  userId: string,
  title: string
): Promise<{ map: MindMap | null; error: Error | null }> {
  const { data: mapRow, error: me } = await supabase
    .from('mind_maps')
    .insert({ user_id: userId, title })
    .select()
    .single()

  if (me) return { map: null, error: mapError(me.message) }
  const map = mapRow as MindMap

  const { error: ne } = await supabase.from('mind_nodes').insert({
    map_id: map.id,
    parent_id: null,
    title: 'Central topic',
    sort_order: 0,
  })

  if (ne) return { map: null, error: mapError(ne.message) }
  return { map, error: null }
}

export async function fetchMindMap(
  mapId: string
): Promise<{ map: MindMap | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('mind_maps')
    .select('*')
    .eq('id', mapId)
    .maybeSingle()

  if (error) return { map: null, error: mapError(error.message) }
  return { map: (data as MindMap) ?? null, error: null }
}

export async function updateMindMapTitle(
  mapId: string,
  title: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('mind_maps').update({ title }).eq('id', mapId)
  if (error) return { error: mapError(error.message) }
  return { error: null }
}

export async function deleteMindMap(mapId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('mind_maps').delete().eq('id', mapId)
  if (error) return { error: mapError(error.message) }
  return { error: null }
}

export async function fetchNodes(mapId: string): Promise<{
  nodes: MindNodeRow[]
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('mind_nodes')
    .select('*')
    .eq('map_id', mapId)
    .order('parent_id', { ascending: true, nullsFirst: true })
    .order('sort_order', { ascending: true })

  if (error) return { nodes: [], error: mapError(error.message) }
  return { nodes: (data ?? []) as MindNodeRow[], error: null }
}

export async function createChildNode(
  mapId: string,
  parentId: string,
  title: string,
  sortOrder: number
): Promise<{ node: MindNodeRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('mind_nodes')
    .insert({
      map_id: mapId,
      parent_id: parentId,
      title,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) return { node: null, error: mapError(error.message) }
  return { node: data as MindNodeRow, error: null }
}

export async function updateNodeTitle(
  nodeId: string,
  title: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('mind_nodes').update({ title }).eq('id', nodeId)
  if (error) return { error: mapError(error.message) }
  return { error: null }
}

export async function updateNodePosition(
  nodeId: string,
  posX: number,
  posY: number
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('mind_nodes')
    .update({ pos_x: posX, pos_y: posY })
    .eq('id', nodeId)
  if (error) return { error: mapError(error.message) }
  return { error: null }
}

export async function deleteNode(nodeId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('mind_nodes').delete().eq('id', nodeId)
  if (error) return { error: mapError(error.message) }
  return { error: null }
}
