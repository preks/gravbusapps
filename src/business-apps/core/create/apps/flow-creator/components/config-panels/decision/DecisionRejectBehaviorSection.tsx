import React, { useCallback, useMemo } from 'react'
import { useFlowStudioStore } from '../../../hooks/useFlowStudioStore'
import type { DecisionNodeConfig, DesignerMode } from '../../../types/studioTypes'
import { RejectBehaviorSection, type RejectReworkConfig } from './RejectBehaviorSection'

interface DecisionRejectBehaviorSectionProps {
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  mode: DesignerMode
  testId: string
  branchEdges: Array<{ id: string; source: string; target: string; label?: string }>
  eligibleSendBackTargets: Array<{ id: string; label: string }>
}

function readRejectRework(config: DecisionNodeConfig): RejectReworkConfig | undefined {
  return (config.rejectRework ??
    (config.userConfig as { rejectRework?: RejectReworkConfig } | undefined)?.rejectRework) as
    | RejectReworkConfig
    | undefined
}

function hasRejectBehavior(rework: RejectReworkConfig | undefined): boolean {
  if (!rework) return false
  return Boolean(rework.requireReason) || Boolean(String(rework.targetNodeId || '').trim())
}

function defaultRejectRework(partial?: Partial<RejectReworkConfig>): RejectReworkConfig {
  return {
    requireReason: partial?.requireReason ?? false,
    preserveData: partial?.preserveData ?? true,
    maxIterations: partial?.maxIterations,
    targetNodeId: partial?.targetNodeId
  }
}

export const DecisionRejectBehaviorSection: React.FC<DecisionRejectBehaviorSectionProps> = ({
  config,
  update,
  mode,
  testId,
  branchEdges,
  eligibleSendBackTargets
}) => {
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)
  const updateEdge = useFlowStudioStore(s => s.updateEdge)

  const rejectEdge = useMemo(
    () =>
      branchEdges.find(
        edge =>
          String(edge.label || '')
            .trim()
            .toLowerCase() === 'reject'
      ) ?? branchEdges[1],
    [branchEdges]
  )

  const endNodeId = useMemo(() => nodes.find(node => node.type === 'end')?.id, [nodes])

  const rework = readRejectRework(config)
  const sendBackEnabled = Boolean(String(rework?.targetNodeId || '').trim())
  const requireReason = Boolean(rework?.requireReason)

  const persistRejectRework = useCallback(
    (next: RejectReworkConfig | undefined) => {
      update({ rejectRework: next } as Partial<DecisionNodeConfig>)
      if (config.decisionMode === 'USER' && config.userConfig) {
        update({
          userConfig: { ...(config.userConfig as object), rejectRework: next } as DecisionNodeConfig['userConfig']
        })
      }
    },
    [config.decisionMode, config.userConfig, update]
  )

  const applyRejectEdge = useCallback(
    (nextRework: RejectReworkConfig | undefined) => {
      if (!rejectEdge?.id) return

      const rejectEdgeFull = edges.find(edge => edge.id === rejectEdge.id)
      const meta: Record<string, unknown> = {
        ...((rejectEdgeFull as { metadata?: Record<string, unknown> })?.metadata ?? {})
      }
      const previousRework =
        meta.rework && typeof meta.rework === 'object' ? (meta.rework as Record<string, unknown>) : {}

      const nextTargetNodeId = String(nextRework?.targetNodeId || '').trim()
      const sendBackActive = Boolean(nextTargetNodeId)

      if (!hasRejectBehavior(nextRework)) {
        const restoreTarget =
          String(previousRework.originalTarget || '').trim() ||
          String(rejectEdgeFull?.target || '').trim() ||
          endNodeId ||
          ''
        const nextMeta = { ...meta }
        delete nextMeta.rework
        delete nextMeta.reworkReason
        updateEdge(rejectEdge.id, { direction: 'forward', target: restoreTarget, metadata: nextMeta })
        return
      }

      const currentDirection = String((rejectEdgeFull as { direction?: string })?.direction || 'forward').toLowerCase()
      const originalTarget =
        String(previousRework.originalTarget || '').trim() ||
        (currentDirection !== 'backward' ? String(rejectEdgeFull?.target || '').trim() : '')

      const sharedRework = {
        originalTarget,
        requireReason: Boolean(nextRework?.requireReason),
        preserveData: nextRework?.preserveData !== false,
        maxIterations: nextRework?.maxIterations
      }

      if (!sendBackActive) {
        const nextMeta = {
          ...meta,
          reworkReason: 'Rejected',
          rework: sharedRework
        }
        const restoreTarget =
          String(originalTarget || '').trim() || String(rejectEdgeFull?.target || '').trim() || endNodeId || ''
        updateEdge(rejectEdge.id, { direction: 'forward', target: restoreTarget, metadata: nextMeta })
        return
      }

      updateEdge(rejectEdge.id, {
        direction: 'backward',
        target: nextTargetNodeId,
        metadata: {
          ...meta,
          reworkReason: 'Rejected',
          rework: {
            ...sharedRework,
            targetNodeId: nextTargetNodeId
          }
        }
      })
    },
    [edges, endNodeId, rejectEdge?.id, updateEdge]
  )

  const updateRejectRework = useCallback(
    (partial: Partial<RejectReworkConfig>) => {
      const base = rework ?? defaultRejectRework()
      const next = { ...base, ...partial }
      const normalized = hasRejectBehavior(next) ? next : undefined
      persistRejectRework(normalized)
      applyRejectEdge(normalized)
    },
    [applyRejectEdge, persistRejectRework, rework]
  )

  return (
    <RejectBehaviorSection
      mode={mode}
      sendBackEnabled={sendBackEnabled}
      sendBackDisabled={!rejectEdge?.id || eligibleSendBackTargets.length === 0}
      requireReason={requireReason}
      selectedTargetId={rework?.targetNodeId}
      eligibleTargets={eligibleSendBackTargets}
      rework={rework}
      onToggleSendBack={checked => {
        if (!checked) {
          const next = rework?.requireReason
            ? defaultRejectRework({
                requireReason: true,
                preserveData: rework?.preserveData ?? true,
                maxIterations: rework?.maxIterations
              })
            : undefined
          persistRejectRework(next)
          applyRejectEdge(next)
          return
        }

        const defaultTarget = rework?.targetNodeId ?? eligibleSendBackTargets[eligibleSendBackTargets.length - 1]?.id
        const next = defaultRejectRework({
          requireReason: rework?.requireReason ?? false,
          preserveData: rework?.preserveData ?? true,
          maxIterations: rework?.maxIterations,
          targetNodeId: defaultTarget
        })
        persistRejectRework(next)
        applyRejectEdge(next)
      }}
      onChangeRequireReason={checked => {
        if (!checked && !sendBackEnabled) {
          persistRejectRework(undefined)
          applyRejectEdge(undefined)
          return
        }

        updateRejectRework({ requireReason: checked })
      }}
      onChangeTarget={targetNodeId => updateRejectRework({ targetNodeId })}
      onChangePreserveData={checked => updateRejectRework({ preserveData: checked })}
      onChangeMaxIterations={value => updateRejectRework({ maxIterations: value })}
      data-testid={`${testId}-reject-behavior`}
    />
  )
}
