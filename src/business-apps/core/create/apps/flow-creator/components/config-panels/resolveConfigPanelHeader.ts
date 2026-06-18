import type React from 'react'
import { Flag, GitFork, Merge, Play } from 'lucide-react'
import type { StudioNode } from '../../types/studioTypes'
import { getStepKindOption } from '../step-picker/stepKindOptions'
import { resolveStepKindFromStudioNode } from '../step-picker/resolveStepKind'

export function resolveConfigPanelHeaderIcon(
  node: StudioNode,
  functions: Array<{ id: string; connectorEnabled?: boolean }>
): React.FC<{ className?: string }> | undefined {
  if (node.type === 'start') return Play
  if (node.type === 'end') return Flag
  if (node.type === 'fork') return GitFork
  if (node.type === 'join') return Merge

  const kindId = resolveStepKindFromStudioNode(node, functions)
  if (!kindId) return undefined
  return getStepKindOption(kindId)?.Icon
}

export function canSwitchStepKind(node: StudioNode | null | undefined): boolean {
  if (!node) return false
  return node.type === 'task' || node.type === 'decision'
}

const STRUCTURAL_NODE_TITLE_KEYS: Partial<Record<StudioNode['type'], string>> = {
  start: 'palette-start',
  end: 'palette-end',
  fork: 'palette-fork',
  join: 'palette-join'
}

export function resolveConfigPanelHeaderTitle(
  node: StudioNode,
  functions: Array<{ id: string; connectorEnabled?: boolean }>,
  t: (key: string) => string
): string {
  const structuralKey = STRUCTURAL_NODE_TITLE_KEYS[node.type]
  if (structuralKey) return t(structuralKey)

  const kindId = resolveStepKindFromStudioNode(node, functions)
  if (kindId) {
    const option = getStepKindOption(kindId)
    if (option) return t(option.labelKey)
  }

  return node.label ?? ''
}
