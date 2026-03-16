/**
 * ForkJoinConfigPanel - Configuration for Fork and Join nodes.
 * Fork: manage parallel branches via edges. Join: configure wait condition.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { Button, Input, Label, Separator, useTranslation } from '@newwork/nw-design-system'
import { GitFork, Merge, Plus, Trash2 } from 'lucide-react'
import translations from '../../_i18n'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { JoinNodeConfig } from '../../types/studioTypes'

function buildForwardAdjacency(
  edges: Array<{ source: string; target: string; direction?: string }>
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()
  for (const e of edges) {
    if (String((e as any)?.direction ?? 'forward') !== 'forward') continue
    const list = adjacency.get(e.source) ?? []
    list.push(e.target)
    adjacency.set(e.source, list)
  }
  return adjacency
}

function bfsDistance(adjacency: Map<string, string[]>, start: string, goal: string): number | null {
  if (!start || !goal) return null
  if (start === goal) return 0
  const visited = new Set<string>([start])
  const queue: Array<{ id: string; d: number }> = [{ id: start, d: 0 }]
  while (queue.length) {
    const cur = queue.shift()!
    const next = adjacency.get(cur.id) ?? []
    for (const n of next) {
      if (!n || visited.has(n)) continue
      if (n === goal) return cur.d + 1
      visited.add(n)
      queue.push({ id: n, d: cur.d + 1 })
    }
  }
  return null
}

function inferForkReferenceForJoin(
  joinId: string,
  forks: Array<{ id: string }>,
  edges: Array<{ source: string; target: string; direction?: string }>
): string | null {
  const adjacency = buildForwardAdjacency(edges)
  const candidates: Array<{ forkId: string; score: number }> = []

  for (const fork of forks) {
    const branchStarts = edges
      .filter(e => e.source === fork.id && String((e as any)?.direction ?? 'forward') === 'forward')
      .map(e => e.target)
      .filter(Boolean)

    // A fork without at least two branch starts isn't meaningful.
    if (branchStarts.length < 2) continue

    const distances = branchStarts.map(s => bfsDistance(adjacency, s, joinId))
    if (distances.some(d => d === null)) continue

    // Prefer the fork whose branches converge "closest" to this join.
    const score = Math.max(...(distances as number[]))
    candidates.push({ forkId: fork.id, score })
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.score - b.score || a.forkId.localeCompare(b.forkId))

  // If the best score ties with the next, it's ambiguous -> don't guess.
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) return null
  return candidates[0].forkId
}

interface ForkConfigPanelProps {
  nodeId: string
  'data-testid'?: string
}

export const ForkConfigPanel: React.FC<ForkConfigPanelProps> = ({
  nodeId,
  'data-testid': testId = 'flow-studio-fork-config'
}) => {
  const { t } = useTranslation(translations)
  const edges = useFlowStudioStore(s => s.edges)
  const nodes = useFlowStudioStore(s => s.nodes)
  const addEdgeAction = useFlowStudioStore(s => s.addEdge)
  const updateEdge = useFlowStudioStore(s => s.updateEdge)
  const requestDeleteEdge = useFlowStudioStore(s => s.requestDeleteEdge)

  // Outgoing edges from this fork node are the canonical branches
  const branchEdges = edges.filter(e => e.source === nodeId && e.direction === 'forward')

  // Find the matching join node (first join whose forkReference points here)
  const joinNode = nodes.find(
    n => n.type === 'join' && n.config.nodeType === 'join' && n.config.forkReference === nodeId
  )

  const addBranch = useCallback(() => {
    // New branch: fork → new task → join (if join exists), else fork → end
    const targetId = joinNode?.id ?? nodes.find(n => n.type === 'end')?.id
    if (!targetId) return
    addEdgeAction(nodeId, targetId, `Branch ${branchEdges.length + 1}`)
  }, [addEdgeAction, branchEdges.length, joinNode, nodeId, nodes])

  const removeBranch = useCallback(
    (edgeId: string) => {
      if (branchEdges.length <= 2) return
      requestDeleteEdge(edgeId)
    },
    [branchEdges.length, requestDeleteEdge]
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:bg-background" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-5 gba:py-3 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md gba:bg-accent">
          <GitFork className="gba:h-4 gba:w-4 gba:text-accent-foreground" />
        </div>
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Parallelize Tasks</h3>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-4 gba:px-5 gba:pb-5">
        <p className="gba:text-xs gba:text-muted-foreground">
          Configure the parallel branches that execute simultaneously.
        </p>

        <Separator />

        <div className="gba:flex gba:items-center gba:justify-between">
          <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('fork-branches')}</Label>
          <Button variant="ghost" size="sm" onClick={addBranch} data-testid={`${testId}-add-branch`}>
            <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
            {t('fork-add-branch')}
          </Button>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-2">
          {branchEdges.map((branch, index) => (
            <div
              key={branch.id}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid={`${testId}-branch-${index}`}
            >
              <div className="gba:w-5 gba:h-5 gba:rounded-full gba:bg-accent gba:flex gba:items-center gba:justify-center gba:text-[10px] gba:font-bold gba:text-accent-foreground gba:flex-shrink-0">
                {index + 1}
              </div>
              <Input
                value={branch.label ?? `Branch ${index + 1}`}
                onChange={e => updateEdge(branch.id, { label: e.target.value })}
                className="gba:flex-1 gba:h-8 gba:text-xs"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeBranch(branch.id)}
                disabled={branchEdges.length <= 2}
              >
                <Trash2 className="gba:h-3 gba:w-3" />
              </Button>
            </div>
          ))}
        </div>

        {joinNode && (
          <>
            <Separator />
            <p className="gba:text-[10px] gba:text-muted-foreground">
              Branches merge at: <span className="gba:font-semibold gba:text-foreground">{joinNode.label}</span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

interface JoinConfigPanelProps {
  nodeId: string
  config: JoinNodeConfig
  'data-testid'?: string
}

export const JoinConfigPanel: React.FC<JoinConfigPanelProps> = ({
  nodeId,
  config,
  'data-testid': testId = 'flow-studio-join-config'
}) => {
  const { t } = useTranslation(translations)
  const updateNodeConfig = useFlowStudioStore(s => s.updateNodeConfig)
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)

  const forkNodes = useMemo(() => nodes.filter(n => n.type === 'fork'), [nodes])
  const selectedFork =
    forkNodes.find(n => n.id === config.forkReference) ?? (forkNodes.length === 1 ? forkNodes[0] : null)

  // Normalize: Conductor currently supports ALL-only semantics in our generator.
  useEffect(() => {
    if (config.joinCondition !== 'ALL') {
      updateNodeConfig(nodeId, { joinCondition: 'ALL' })
    }
  }, [config.joinCondition, nodeId, updateNodeConfig])

  // Auto-wire fork reference when only one fork exists.
  useEffect(() => {
    if (!config.forkReference && forkNodes.length === 1) {
      updateNodeConfig(nodeId, { forkReference: forkNodes[0].id })
    }
  }, [config.forkReference, forkNodes, nodeId, updateNodeConfig])

  // Auto-derive fork reference from graph connections when possible.
  useEffect(() => {
    const derived = inferForkReferenceForJoin(
      nodeId,
      forkNodes.map(f => ({ id: f.id })),
      edges
    )
    if (!derived) return
    if (config.forkReference !== derived) {
      updateNodeConfig(nodeId, { forkReference: derived })
    }
  }, [config.forkReference, edges, forkNodes, nodeId, updateNodeConfig])

  const forkLinkingOk = Boolean(String(config.forkReference || '').trim() && selectedFork)

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:bg-background" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-5 gba:py-3 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md gba:bg-accent">
          <Merge className="gba:h-4 gba:w-4 gba:text-accent-foreground" />
        </div>
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Merge Parallel Tasks</h3>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-4 gba:px-5 gba:pb-5">
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('join-condition')}</Label>
          <div
            className="gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-md gba:bg-muted gba:text-sm gba:text-foreground"
            data-testid={`${testId}-condition`}
          >
            {t('join-wait-all')}
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">
            This merge waits until all parallel branches have finished before continuing.
          </p>
        </div>

        {!forkLinkingOk ? (
          <p className="gba:text-xs gba:text-destructive" data-testid={`${testId}-fork-ref-warning`}>
            This merge is not linked to a parallel split yet. Connect the split branches into this merge.
          </p>
        ) : null}
      </div>
    </div>
  )
}
