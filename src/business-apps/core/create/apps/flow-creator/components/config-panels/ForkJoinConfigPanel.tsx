/**
 * ForkJoinConfigPanel - Configuration for Fork and Join nodes.
 * Fork: manage parallel branches via edges. Join: configure wait condition.
 */

import React, { useCallback } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator
} from '@newwork/nw-design-system'
import { useTranslation } from '@newwork/nw-design-system'
import { GitFork, Merge, Plus, Trash2 } from 'lucide-react'
import translations from '../../_i18n'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { ForkNodeConfig, JoinNodeConfig, DesignerMode } from '../../types/studioTypes'

interface ForkConfigPanelProps {
  nodeId: string
  config: ForkNodeConfig
  mode: DesignerMode
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
  mode: DesignerMode
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

  const forkNodes = nodes.filter(n => n.type === 'fork')

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
          <Select
            value={config.joinCondition}
            onValueChange={v => updateNodeConfig(nodeId, { joinCondition: v as 'ALL' | 'ANY' })}
          >
            <SelectTrigger data-testid={`${testId}-condition`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('join-wait-all')}</SelectItem>
              <SelectItem value="ANY">{t('join-wait-any')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">Fork Reference</Label>
          <Select value={config.forkReference} onValueChange={v => updateNodeConfig(nodeId, { forkReference: v })}>
            <SelectTrigger data-testid={`${testId}-fork-ref`}>
              <SelectValue placeholder="Select matching fork" />
            </SelectTrigger>
            <SelectContent>
              {forkNodes.map(n => (
                <SelectItem key={n.id} value={n.id}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
