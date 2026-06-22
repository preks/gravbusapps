import type { MeshNodeKind } from '../../utils/traceModel'

export type MeshLayerKey = 'agents' | 'skills' | 'tools'

export interface MeshLayerDescriptor {
  key: MeshLayerKey
  labelKey: string
  /** Node kinds toggled by this layer. Orchestrator is always visible. */
  kinds: MeshNodeKind[]
}

export const MESH_LAYERS: MeshLayerDescriptor[] = [
  { key: 'agents', labelKey: 'agent-mesh-layer-agents', kinds: ['subagent', 'expert'] },
  { key: 'skills', labelKey: 'agent-mesh-layer-skills', kinds: ['skill'] },
  { key: 'tools', labelKey: 'agent-mesh-layer-tools', kinds: ['tool'] }
]

export const ALL_LAYERS: ReadonlySet<MeshLayerKey> = new Set(MESH_LAYERS.map(l => l.key))

export function layerForKind(kind: MeshNodeKind): MeshLayerKey | null {
  for (const layer of MESH_LAYERS) {
    if (layer.kinds.includes(kind)) return layer.key
  }
  return null
}

export function isKindVisible(kind: MeshNodeKind, activeLayers: ReadonlySet<MeshLayerKey>): boolean {
  if (kind === 'orchestrator') return true
  const layer = layerForKind(kind)
  if (!layer) return true
  return activeLayers.has(layer)
}
