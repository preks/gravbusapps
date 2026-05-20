/**
 * DecisionConfigPanel - Configuration for decision nodes with USER/AI/LOGIC tabs.
 * Simple mode: policy picker for AI decisions.
 * Advanced mode: full prompt config, custom expressions.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { GitBranch } from 'lucide-react'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'
import type { DecisionMode, DecisionNodeConfig, DesignerMode, FlowStudioUpdateOptions } from '../../types/studioTypes'
import { AIDecisionConfig } from './decision/AIDecisionConfig'
import { DecisionKindSelector } from './decision/DecisionKindSelector'
import { DecisionOutcomesSection } from './decision/DecisionOutcomesSection'
import { DecisionRejectBehaviorSection } from './decision/DecisionRejectBehaviorSection'
import { LogicDecisionConfig } from './decision/LogicDecisionConfig'
import { UserDecisionConfig } from './decision/UserDecisionConfig'
import { useDecisionBranchSanitizers } from './decision/useDecisionBranchSanitizers'
import { useEligibleSendBackTargets } from './decision/user/useEligibleSendBackTargets'
import { collectAssignmentPersonFieldOptions } from '../../utils/assignmentPersonFieldUtils'

interface DecisionConfigPanelProps {
  nodeId: string
  config: DecisionNodeConfig
  mode: DesignerMode
  accessToken: string
  studioData: FlowStudioData
  'data-testid'?: string
}

export const DecisionConfigPanel: React.FC<DecisionConfigPanelProps> = ({
  nodeId,
  config,
  mode,
  accessToken,
  studioData,
  'data-testid': testId = 'flow-studio-decision-config'
}) => {
  const updateNodeConfig = useFlowStudioStore(s => s.updateNodeConfig)
  const edges = useFlowStudioStore(s => s.edges)
  const addEdge = useFlowStudioStore(s => s.addEdge)
  const updateEdge = useFlowStudioStore(s => s.updateEdge)
  const requestDeleteEdges = useFlowStudioStore(s => s.requestDeleteEdges)
  const nodes = useFlowStudioStore(s => s.nodes)

  const availableStartFields = useMemo(() => {
    return collectAssignmentPersonFieldOptions({ nodes, edges: edges as any, currentNodeId: nodeId })
  }, [edges, nodeId, nodes])

  const branchEdges = edges.filter(edge => edge.source === nodeId)

  const eligibleSendBackTargets = useMemo(
    () => useEligibleSendBackTargets(nodes as any, edges as any, nodeId),
    [edges, nodeId, nodes]
  )

  const update = useCallback(
    (partial: Partial<DecisionNodeConfig>, options?: FlowStudioUpdateOptions) => {
      updateNodeConfig(nodeId, partial, options)
    },
    [nodeId, updateNodeConfig]
  )

  const handleDecisionModeChange = useCallback(
    (next: DecisionMode) => {
      if (next === config.decisionMode) return

      if (next === 'LOGIC') {
        update({
          decisionMode: next,
          userConfig: undefined,
          aiConfig: undefined,
          logicConfig: undefined,
          links: [],
          rejectRework: undefined
        })
        return
      }

      update({
        decisionMode: next,
        userConfig: undefined,
        aiConfig: undefined,
        logicConfig: undefined,
        rejectRework: undefined
      })
    },
    [config.decisionMode, update]
  )

  useDecisionBranchSanitizers(config, update)

  const approvalOutcomesSelected = useMemo(() => {
    const t = String((config.userConfig as any)?.userDecisionType || '')
      .trim()
      .toUpperCase()
    if (t === 'APPROVAL') return true
    if (config.branches.length !== 2) return false
    const a = String(config.branches[0]?.label || '')
      .trim()
      .toLowerCase()
    const b = String(config.branches[1]?.label || '')
      .trim()
      .toLowerCase()
    const isApprove = (s: string) => s === 'approve' || s.startsWith('approve')
    const isReject = (s: string) => s === 'reject' || s.startsWith('reject')
    return (isApprove(a) && isReject(b)) || (isApprove(b) && isReject(a))
  }, [config.branches, config.userConfig])

  // If outcomes are no longer approval-style, ensure we remove any rework/backward edge state.
  useEffect(() => {
    if (approvalOutcomesSelected) return
    const outgoing = edges.filter(e => e.source === nodeId)
    const endNodeId = nodes.find(n => n.type === 'end')?.id
    for (const e of outgoing) {
      const meta: any = (e as any)?.metadata
      const hasRework = Boolean(meta?.rework)
      const isBackward = String((e as any)?.direction || 'forward').toLowerCase() === 'backward'
      if (!hasRework && !isBackward) continue
      const originalTarget = String(meta?.rework?.originalTarget || '').trim()
      const nextMeta = { ...(meta || {}) }
      if (nextMeta.rework) delete nextMeta.rework
      if (nextMeta.reworkReason) delete nextMeta.reworkReason
      updateEdge(e.id, { direction: 'forward', target: originalTarget || e.target || endNodeId, metadata: nextMeta })
    }
  }, [approvalOutcomesSelected, edges, nodeId, nodes, updateEdge])

  const syncBranches = useCallback(
    (labels: string[]) => {
      const fallbackTarget = nodes.find(n => n.type === 'end' && n.id !== nodeId) ?? nodes.find(n => n.id !== nodeId)
      if (!fallbackTarget) return

      for (let i = 0; i < labels.length; i++) {
        if (i < branchEdges.length) {
          updateEdge(branchEdges[i].id, { label: labels[i] })
        } else {
          addEdge(nodeId, fallbackTarget.id, labels[i])
        }
      }

      const surplus = branchEdges.slice(labels.length).map(e => e.id)
      if (surplus.length > 0) requestDeleteEdges(surplus)
    },
    [addEdge, branchEdges, nodeId, nodes, requestDeleteEdges, updateEdge]
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-5 gba:py-3 gba:border-b gba:border-border gba:bg-background">
        <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md gba:bg-muted">
          <GitBranch className="gba:h-4 gba:w-4 gba:text-foreground" />
        </div>
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Decision</h3>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-5 gba:flex gba:flex-col gba:gap-4">
        <DecisionOutcomesSection
          config={config}
          branchEdges={branchEdges}
          syncBranches={syncBranches}
          update={update}
          onUpdateEdgeLabel={(edgeId, label) => updateEdge(edgeId, { label })}
          testId={testId}
        />

        <DecisionKindSelector
          value={config.decisionMode}
          onChange={next => handleDecisionModeChange(next as DecisionMode)}
          testId={testId}
        />

        {config.decisionMode === 'USER' ? (
          <UserDecisionConfig
            config={config}
            update={update}
            mode={mode}
            testId={testId}
            accessToken={accessToken}
            studioData={studioData}
            branchEdges={branchEdges}
            nodeId={nodeId}
            availableStartFields={availableStartFields}
          />
        ) : null}

        {config.decisionMode === 'AI' ? (
          <>
            <AIDecisionConfig
              nodeId={nodeId}
              config={config}
              update={update}
              mode={mode}
              testId={testId}
              accessToken={accessToken}
              studioData={studioData}
              availableStartFields={availableStartFields}
            />
          </>
        ) : null}

        {config.decisionMode === 'LOGIC' ? (
          <LogicDecisionConfig config={config} update={update} mode={mode} testId={testId} />
        ) : null}

        {approvalOutcomesSelected ? (
          <DecisionRejectBehaviorSection
            config={config}
            update={update}
            mode={mode}
            testId={testId}
            nodeId={nodeId}
            branchEdges={branchEdges}
            eligibleSendBackTargets={eligibleSendBackTargets}
          />
        ) : null}
      </div>
    </div>
  )
}
